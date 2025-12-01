#!/usr/bin/env python3
"""
3CX Call Data Processor - Self-Healing Supabase Loader

This script:
1. Connects to your email and finds all 3CX Report emails back to April 2025
2. Tracks which dates have been loaded into Supabase
3. Automatically identifies and fills gaps (self-healing)
4. Parses call records and loads them with proper structure
5. Handles both daily incremental loads and historical backfill

Usage:
    python threecx_supabase_processor.py                    # Normal run - fill gaps + today
    python threecx_supabase_processor.py --backfill         # Full backfill from April 2025
    python threecx_supabase_processor.py --status           # Show coverage status
    python threecx_supabase_processor.py --load-csv file.csv # Load a manual CSV export
    python threecx_supabase_processor.py --show-ddl         # Print Supabase DDL
"""

import os
import re
import csv
import json
import argparse
import logging
import imaplib
import email
import email.utils
from email.header import decode_header
from datetime import datetime, timedelta, date
from typing import List, Dict, Optional, Set, Tuple, Any
from pathlib import Path
import requests
from io import StringIO

from dotenv import load_dotenv
from supabase import create_client, Client
import pytz

load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Constants
TZ = pytz.timezone(os.getenv("APP_TIMEZONE", "America/New_York"))
# Sept 12, 2025 is when 3CX switched from URL downloads to email attachments
BACKFILL_START_DATE = date(2025, 9, 12)
ATTACHMENT_FORMAT_START = date(2025, 9, 12)  # When attachments started


class CallRecordParser:
    """Parses raw 3CX CSV data into structured records."""
    
    @staticmethod
    def time_to_seconds(time_str: str) -> int:
        """Convert HH:MM:SS to seconds."""
        if not time_str or time_str == '':
            return 0
        try:
            parts = str(time_str).split(':')
            if len(parts) == 3:
                return int(parts[0]) * 3600 + int(parts[1]) * 60 + int(parts[2])
        except (ValueError, IndexError):
            pass
        return 0
    
    @staticmethod
    def extract_extension(val: str) -> Optional[str]:
        """Extract 3-digit extension from fields like 'Orlando, Julissa (117)'."""
        if not val:
            return None
        match = re.search(r'\((\d{3})\)', str(val))
        return match.group(1) if match else None
    
    @staticmethod
    def extract_name(val: str) -> Optional[str]:
        """Extract name portion from 'Name (ext)' format."""
        if not val:
            return None
        match = re.match(r'^([^(]+)', str(val))
        name = match.group(1).strip() if match else str(val).strip()
        name = re.sub(r'\s+', ' ', name)
        return name if name else None
    
    @staticmethod
    def clean_phone(val: str) -> Optional[str]:
        """Extract 10-digit phone from various formats."""
        if not val:
            return None
        digits = re.sub(r'\D', '', str(val))
        if len(digits) == 11 and digits.startswith('1'):
            return digits[1:]
        elif len(digits) == 10:
            return digits
        match = re.search(r'\((\d{10})\)', str(val))
        if match:
            return match.group(1)
        return None
    
    @staticmethod
    def parse_row(row: Dict[str, Any], source_file: str = None) -> Optional[Dict[str, Any]]:
        """Parse a single CSV row into a structured record."""
        try:
            call_time_str = row.get('Call Time', '')
            if not call_time_str or call_time_str == 'Totals':
                return None
            
            try:
                call_time = datetime.fromisoformat(call_time_str.replace('Z', '+00:00'))
            except ValueError:
                logger.warning(f"Could not parse call time: {call_time_str}")
                return None
            
            direction = row.get('Direction', '').strip()
            status = row.get('Status', '').strip()
            from_field = row.get('From', '').strip()
            to_field = row.get('To', '').strip()
            
            extension = None
            employee_name = None
            phone_number = None
            caller_id_raw = None
            
            if direction == 'Outbound':
                extension = CallRecordParser.extract_extension(from_field)
                employee_name = CallRecordParser.extract_name(from_field)
                phone_number = CallRecordParser.clean_phone(to_field)
                caller_id_raw = from_field
            elif direction == 'Inbound':
                extension = CallRecordParser.extract_extension(to_field)
                employee_name = CallRecordParser.extract_name(to_field)
                phone_number = CallRecordParser.clean_phone(from_field)
                caller_id_raw = from_field
            elif direction == 'Internal':
                extension = CallRecordParser.extract_extension(from_field)
                employee_name = CallRecordParser.extract_name(from_field)
                caller_id_raw = from_field
            
            ringing_seconds = CallRecordParser.time_to_seconds(row.get('Ringing', ''))
            talking_seconds = CallRecordParser.time_to_seconds(row.get('Talking', ''))
            
            try:
                cost = float(row.get('Cost', 0) or 0)
            except (ValueError, TypeError):
                cost = 0.0
            
            return {
                'call_time': call_time.isoformat(),
                'call_id': row.get('Call ID', ''),
                'call_date': call_time.date().isoformat(),
                'direction': direction,
                'status': status,
                'extension': extension,
                'employee_name': employee_name,
                'phone_number': phone_number,
                'linked': phone_number,  # Clean 10-digit number for customer matching
                'caller_id_raw': caller_id_raw,
                'ringing_seconds': ringing_seconds,
                'talking_seconds': talking_seconds,
                'cost': cost,
                'from_field': from_field,
                'to_field': to_field,
                'call_activity_details': row.get('Call Activity Details', ''),
                'source_file': source_file
            }
        except Exception as e:
            logger.warning(f"Error parsing row: {e}")
            return None


class SupabaseCallStore:
    """Handles all Supabase operations for call records."""
    
    def __init__(self):
        url = os.getenv("SUPABASE_URL")
        key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        if not url or not key:
            raise ValueError("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
        self.client: Client = create_client(url, key)
    
    def get_loaded_dates(self) -> Set[date]:
        """Get all dates that have been loaded into Supabase."""
        try:
            result = self.client.table("call_load_tracker").select("load_date").execute()
            dates = set()
            for row in result.data or []:
                try:
                    d = datetime.fromisoformat(row['load_date']).date()
                    dates.add(d)
                except (ValueError, KeyError):
                    pass
            return dates
        except Exception as e:
            logger.warning(f"Could not fetch loaded dates: {e}")
            return set()
    
    def mark_date_loaded(self, load_date: date, record_count: int, source: str):
        """Mark a date as loaded in the tracker."""
        try:
            self.client.table("call_load_tracker").upsert({
                'load_date': load_date.isoformat(),
                'record_count': record_count,
                'source': source,
                'loaded_at': datetime.utcnow().isoformat()
            }).execute()
        except Exception as e:
            logger.error(f"Failed to mark date {load_date} as loaded: {e}")
    
    def insert_records(self, records: List[Dict[str, Any]]) -> int:
        """Insert call records into Supabase."""
        if not records:
            return 0
        
        inserted = 0
        batch_size = 500
        
        for i in range(0, len(records), batch_size):
            batch = records[i:i + batch_size]
            try:
                self.client.table("call_records").upsert(
                    batch,
                    on_conflict="call_time,call_id,from_field,to_field"
                ).execute()
                inserted += len(batch)
            except Exception as e:
                logger.error(f"Error inserting batch: {e}")
                for record in batch:
                    try:
                        self.client.table("call_records").upsert(
                            record,
                            on_conflict="call_time,call_id,from_field,to_field"
                        ).execute()
                        inserted += 1
                    except Exception:
                        pass
        
        return inserted
    
    def get_date_stats(self) -> Dict[str, Any]:
        """Get statistics about loaded data."""
        try:
            result = self.client.table("call_records").select(
                "call_date"
            ).order("call_date", desc=False).limit(1).execute()
            min_date = result.data[0]['call_date'] if result.data else None
            
            result = self.client.table("call_records").select(
                "call_date"
            ).order("call_date", desc=True).limit(1).execute()
            max_date = result.data[0]['call_date'] if result.data else None
            
            result = self.client.table("call_records").select(
                "id", count="exact"
            ).execute()
            total_count = result.count or 0
            
            loaded_dates = self.get_loaded_dates()
            
            return {
                'min_date': min_date,
                'max_date': max_date,
                'total_records': total_count,
                'days_loaded': len(loaded_dates)
            }
        except Exception as e:
            logger.error(f"Error getting stats: {e}")
            return {}


class EmailReportFetcher:
    """Fetches 3CX reports from email."""
    
    def __init__(self):
        self.email_address = os.getenv('EMAIL_ADDRESS')
        self.email_password = os.getenv('EMAIL_PASSWORD')
        self.imap_server = os.getenv('IMAP_SERVER', 'mail.optonline.net')
        self.imap_port = int(os.getenv('IMAP_PORT', '993'))
        
        if not self.email_address or not self.email_password:
            raise ValueError("Missing EMAIL_ADDRESS or EMAIL_PASSWORD")
    
    def connect(self) -> imaplib.IMAP4_SSL:
        """Connect to IMAP server."""
        conn = imaplib.IMAP4_SSL(self.imap_server, self.imap_port)
        conn.login(self.email_address, self.email_password)
        logger.info(f"Connected to email: {self.email_address}")
        return conn
    
    def find_3cx_reports(self, conn: imaplib.IMAP4_SSL, since_date: date) -> List[Tuple[bytes, Optional[date]]]:
        """
        Find 3CX Report emails with attachments.
        For backfill, we only need 4 emails: 9/12, 10/1, 11/1, and most recent (11/29 or 11/30)
        Each email contains 30 days of data.
        """
        conn.select('INBOX')
        
        date_str = since_date.strftime('%d-%b-%Y')
        
        # Search for emails with 3CX report subjects
        all_email_ids = []
        
        search_subjects = [
            'Your 3CX Report DB_DATA',
            'Your 3CX Scheduled Reports'
        ]
        
        for subject in search_subjects:
            try:
                search_criteria = f'(SUBJECT "{subject}" SINCE {date_str})'
                typ, data = conn.search(None, search_criteria)
                if typ == 'OK' and data[0]:
                    for eid in data[0].split():
                        if eid not in all_email_ids:
                            all_email_ids.append(eid)
            except Exception as e:
                logger.warning(f"Search error for '{subject}': {e}")
        
        logger.info(f"Found {len(all_email_ids)} total 3CX Report emails since {since_date}")
        
        # Get dates for all emails
        results = []
        for email_id in all_email_ids:
            try:
                typ, msg_data = conn.fetch(email_id, '(BODY[HEADER.FIELDS (DATE)])')
                if typ == 'OK' and msg_data[0]:
                    header = msg_data[0][1].decode('utf-8', errors='ignore')
                    date_match = re.search(r'Date:\s*(.+)', header)
                    if date_match:
                        date_str_val = date_match.group(1).strip()
                        try:
                            email_date = email.utils.parsedate_to_datetime(date_str_val).date()
                            results.append((email_id, email_date))
                        except Exception:
                            pass
            except Exception as e:
                logger.warning(f"Error fetching email {email_id}: {e}")
        
        # Sort by date
        results.sort(key=lambda x: x[1] or date.min)
        
        return results
    
    def find_backfill_emails(self, conn: imaplib.IMAP4_SSL) -> List[Tuple[bytes, date]]:
        """
        Find the 4 specific emails needed for full backfill:
        - 9/12/2025 (or closest)
        - 10/1/2025 (or closest)
        - 11/1/2025 (or closest)
        - Most recent (11/29 or 11/30)
        """
        all_reports = self.find_3cx_reports(conn, BACKFILL_START_DATE)
        
        if not all_reports:
            return []
        
        # Target dates we want
        target_dates = [
            date(2025, 9, 12),
            date(2025, 10, 1),
            date(2025, 11, 1),
        ]
        
        selected = []
        
        # Find closest email for each target date
        for target in target_dates:
            best_match = None
            best_diff = timedelta(days=999)
            for email_id, email_date in all_reports:
                if email_date:
                    diff = abs(email_date - target)
                    if diff < best_diff:
                        best_diff = diff
                        best_match = (email_id, email_date)
            if best_match and best_match not in selected:
                selected.append(best_match)
                logger.info(f"Selected email dated {best_match[1]} for target {target}")
        
        # Add most recent email
        if all_reports:
            most_recent = max(all_reports, key=lambda x: x[1] or date.min)
            if most_recent not in selected:
                selected.append(most_recent)
                logger.info(f"Selected most recent email dated {most_recent[1]}")
        
        # Sort chronologically
        selected.sort(key=lambda x: x[1])
        
        logger.info(f"Selected {len(selected)} emails for backfill")
        return selected
    
    def extract_csv_from_email(self, conn: imaplib.IMAP4_SSL, email_id: bytes) -> Optional[str]:
        """
        Extract CSV content from a 3CX Report email attachment.
        Only handles the new format (Sept 12, 2025+) with CSV attachments.
        """
        try:
            typ, data = conn.fetch(email_id, '(RFC822)')
            if typ != 'OK':
                return None
            
            raw_email = data[0][1]
            msg = email.message_from_bytes(raw_email)
            
            # Look for CSV attachments
            if msg.is_multipart():
                for part in msg.walk():
                    filename = part.get_filename()
                    
                    # Check if this is a CSV attachment (DBDATA_xxxx.csv format)
                    if filename and (filename.lower().endswith('.csv') or 'DBDATA' in (filename or '')):
                        try:
                            payload = part.get_payload(decode=True)
                            if payload:
                                csv_content = payload.decode('utf-8', errors='ignore')
                                # Verify it looks like valid CSV with our expected header
                                if 'Call Time' in csv_content:
                                    logger.info(f"Found CSV attachment: {filename}")
                                    return csv_content
                        except Exception as e:
                            logger.warning(f"Error decoding attachment {filename}: {e}")
                            continue
            
            logger.warning("No CSV attachment found in email")
            return None
        except Exception as e:
            logger.error(f"Error extracting CSV from email: {e}")
            return None


class ThreeCXProcessor:
    """Main processor that orchestrates the self-healing data load."""
    
    def __init__(self):
        self.store = SupabaseCallStore()
        self.email_fetcher = EmailReportFetcher()
        self.parser = CallRecordParser()
    
    def parse_csv_content(self, csv_content: str, source_file: str = None) -> List[Dict[str, Any]]:
        """Parse CSV content into list of call records, removing duplicates."""
        records = []
        seen = set()  # Track unique records by key fields
        
        content = csv_content.replace('\ufeff', '').replace('\r\n', '\n').replace('\r', '\n')
        
        lines = content.split('\n')
        header_index = -1
        for i, line in enumerate(lines):
            if line.startswith('Call Time'):
                header_index = i
                break
        
        if header_index == -1:
            logger.warning("No header row found in CSV")
            return records
        
        csv_content = '\n'.join(lines[header_index:])
        reader = csv.DictReader(StringIO(csv_content))
        
        dupe_count = 0
        for row in reader:
            parsed = self.parser.parse_row(row, source_file)
            if parsed:
                # Create a unique key for deduplication
                # Use call_time + call_id + from + to as the unique identifier
                dedup_key = (
                    parsed['call_time'],
                    parsed['call_id'],
                    parsed['from_field'],
                    parsed['to_field']
                )
                
                if dedup_key not in seen:
                    seen.add(dedup_key)
                    records.append(parsed)
                else:
                    dupe_count += 1
        
        if dupe_count > 0:
            logger.info(f"Removed {dupe_count} duplicate rows during parsing")
        
        return records
    
    def load_csv_file(self, filepath: str) -> int:
        """Load a CSV file into Supabase with deduplication."""
        logger.info(f"Loading CSV file: {filepath}")
        
        # Get file size for progress indication
        file_size = os.path.getsize(filepath)
        logger.info(f"File size: {file_size / (1024*1024):.1f} MB")
        
        with open(filepath, 'r', encoding='utf-8-sig') as f:
            content = f.read()
        
        logger.info("Parsing CSV and removing duplicates...")
        records = self.parse_csv_content(content, source_file=os.path.basename(filepath))
        
        if not records:
            logger.warning("No valid records found in file")
            return 0
        
        logger.info(f"Parsed {len(records)} unique records")
        
        by_date: Dict[date, List[Dict]] = {}
        for record in records:
            d = datetime.fromisoformat(record['call_date']).date()
            if d not in by_date:
                by_date[d] = []
            by_date[d].append(record)
        
        logger.info(f"Data spans {len(by_date)} days: {min(by_date.keys())} to {max(by_date.keys())}")
        
        total_inserted = 0
        for i, (load_date, date_records) in enumerate(sorted(by_date.items())):
            inserted = self.store.insert_records(date_records)
            self.store.mark_date_loaded(load_date, len(date_records), f"csv:{os.path.basename(filepath)}")
            total_inserted += inserted
            
            # Progress indicator every 10 days
            if (i + 1) % 10 == 0:
                logger.info(f"  Progress: {i + 1}/{len(by_date)} days loaded...")
        
        logger.info(f"Total loaded: {total_inserted} records across {len(by_date)} days")
        return total_inserted
    
    def get_missing_dates(self, start_date: date, end_date: date) -> List[date]:
        """Get list of dates that haven't been loaded yet."""
        loaded_dates = self.store.get_loaded_dates()
        
        missing = []
        current = start_date
        while current <= end_date:
            if current.weekday() < 5 and current not in loaded_dates:
                missing.append(current)
            current += timedelta(days=1)
        
        return missing
    
    def process_all_emails(self, conn: imaplib.IMAP4_SSL, emails_to_process: List[Tuple[bytes, date]]) -> int:
        """Process specified 3CX report emails and load all data."""
        
        if not emails_to_process:
            logger.warning("No emails to process")
            return 0
        
        logger.info(f"Processing {len(emails_to_process)} emails...")
        
        total_inserted = 0
        all_dates_loaded = set()
        
        for i, (email_id, email_date) in enumerate(emails_to_process):
            logger.info(f"Processing email {i+1}/{len(emails_to_process)} dated {email_date}...")
            
            csv_content = self.email_fetcher.extract_csv_from_email(conn, email_id)
            if not csv_content:
                logger.warning(f"  No CSV found in email dated {email_date}")
                continue
            
            records = self.parse_csv_content(csv_content, source_file=f"email:{email_date}")
            
            if not records:
                logger.warning(f"  No valid records in email dated {email_date}")
                continue
            
            # Group by date
            by_date: Dict[date, List[Dict]] = {}
            for record in records:
                d = datetime.fromisoformat(record['call_date']).date()
                if d not in by_date:
                    by_date[d] = []
                by_date[d].append(record)
            
            # Load each date's records (skip if already loaded from earlier email)
            email_inserted = 0
            new_dates = 0
            for d, date_records in sorted(by_date.items()):
                if d not in all_dates_loaded:
                    inserted = self.store.insert_records(date_records)
                    self.store.mark_date_loaded(d, len(date_records), f"email:{email_date}")
                    all_dates_loaded.add(d)
                    email_inserted += inserted
                    new_dates += 1
            
            total_inserted += email_inserted
            logger.info(f"  Loaded {email_inserted} records, {new_dates} new days (skipped {len(by_date) - new_dates} overlapping days)")
        
        logger.info(f"Backfill complete: {total_inserted} total records, {len(all_dates_loaded)} unique days")
        return total_inserted
    
    def run_backfill(self, start_date: date = None):
        """
        Run a full backfill from email.
        Fetches only 4 emails needed: 9/12, 10/1, 11/1, and most recent.
        Each email has 30 days of data, so this covers everything.
        """
        logger.info("Starting backfill...")
        logger.info("Will fetch 4 emails: ~9/12, ~10/1, ~11/1, and most recent")
        
        conn = self.email_fetcher.connect()
        try:
            # Find the 4 specific emails we need
            emails_to_process = self.email_fetcher.find_backfill_emails(conn)
            
            if not emails_to_process:
                logger.error("No emails found for backfill")
                return
            
            total = self.process_all_emails(conn, emails_to_process)
            logger.info(f"Backfill finished: {total} records loaded")
        finally:
            try:
                conn.logout()
            except:
                pass
    
    def run(self):
        """
        Fully automatic self-healing run.
        1. Check Supabase for what dates are already loaded
        2. Determine what's missing
        3. Fetch only the emails needed to fill gaps
        """
        logger.info("=" * 60)
        logger.info("3CX Data Loader - Automatic Run")
        logger.info("=" * 60)
        
        # Step 1: Check what we have in Supabase
        loaded_dates = self.store.get_loaded_dates()
        today = datetime.now(TZ).date()
        yesterday = today - timedelta(days=1)
        
        if loaded_dates:
            min_loaded = min(loaded_dates)
            max_loaded = max(loaded_dates)
            logger.info(f"Supabase has data: {min_loaded} to {max_loaded} ({len(loaded_dates)} days)")
        else:
            logger.info("Supabase is empty - will do full backfill")
        
        # Step 2: Determine what we need
        # We want data from Aug 13, 2025 (30 days before first email on 9/12) through yesterday
        earliest_needed = date(2025, 8, 13)
        
        # Find missing weekdays
        missing_dates = []
        current = earliest_needed
        while current <= yesterday:
            if current.weekday() < 5 and current not in loaded_dates:  # Weekdays only
                missing_dates.append(current)
            current += timedelta(days=1)
        
        if not missing_dates:
            logger.info("All data is up to date! Nothing to load.")
            return
        
        logger.info(f"Missing {len(missing_dates)} days of data")
        logger.info(f"  Earliest missing: {min(missing_dates)}")
        logger.info(f"  Latest missing: {max(missing_dates)}")
        
        # Step 3: Determine which emails we need
        # Each email has 30 days of data, so we pick strategically
        conn = self.email_fetcher.connect()
        try:
            all_reports = self.email_fetcher.find_3cx_reports(conn, BACKFILL_START_DATE)
            
            if not all_reports:
                logger.error("No 3CX report emails found!")
                return
            
            logger.info(f"Found {len(all_reports)} emails in inbox")
            
            # Select emails that cover our missing dates
            emails_needed = self._select_emails_for_dates(all_reports, missing_dates)
            
            if not emails_needed:
                logger.warning("Could not find emails covering missing dates")
                return
            
            logger.info(f"Will process {len(emails_needed)} email(s)")
            
            # Step 4: Process the emails
            total = self.process_all_emails(conn, emails_needed)
            
            logger.info("=" * 60)
            logger.info(f"Complete! Loaded {total} records")
            logger.info("=" * 60)
            
        finally:
            try:
                conn.logout()
            except:
                pass
    
    def _select_emails_for_dates(self, all_reports: List[Tuple[bytes, date]], missing_dates: List[date]) -> List[Tuple[bytes, date]]:
        """
        Select the minimum emails needed to cover missing dates.
        Each email covers ~30 days before its date.
        """
        missing_set = set(missing_dates)
        selected = []
        covered = set()
        
        # Sort reports by date descending (newest first)
        sorted_reports = sorted(all_reports, key=lambda x: x[1] or date.min, reverse=True)
        
        # Greedily select emails that cover the most uncovered missing dates
        for email_id, email_date in sorted_reports:
            if not email_date:
                continue
            
            # This email covers approximately email_date - 30 days to email_date
            email_covers_start = email_date - timedelta(days=30)
            email_covers_end = email_date
            
            # What missing dates would this email cover?
            would_cover = set()
            for d in missing_set:
                if email_covers_start <= d <= email_covers_end and d not in covered:
                    would_cover.add(d)
            
            if would_cover:
                selected.append((email_id, email_date))
                covered.update(would_cover)
                logger.info(f"  Email {email_date}: covers {len(would_cover)} missing days")
                
                # Check if we've covered everything
                if covered >= missing_set:
                    break
        
        # Sort selected emails chronologically for processing
        selected.sort(key=lambda x: x[1])
        
        return selected
    
    def show_status(self):
        """Show current data coverage status."""
        stats = self.store.get_date_stats()
        loaded_dates = self.store.get_loaded_dates()
        
        print("\n" + "=" * 60)
        print("3CX DATA COVERAGE STATUS")
        print("=" * 60)
        
        if stats:
            print(f"Date Range:     {stats.get('min_date')} to {stats.get('max_date')}")
            print(f"Total Records:  {stats.get('total_records', 0):,}")
            print(f"Days Loaded:    {stats.get('days_loaded', 0)}")
        
        if loaded_dates:
            min_loaded = min(loaded_dates)
            max_loaded = max(loaded_dates)
            expected_days = (max_loaded - min_loaded).days + 1
            expected_weekdays = sum(1 for i in range(expected_days) 
                                    if (min_loaded + timedelta(days=i)).weekday() < 5)
            coverage = (len(loaded_dates) / expected_weekdays * 100) if expected_weekdays > 0 else 0
            print(f"Coverage:       {coverage:.1f}% (weekdays only)")
        
        today = datetime.now(TZ).date()
        month_ago = today - timedelta(days=30)
        missing = self.get_missing_dates(month_ago, today)
        
        if missing:
            print(f"\nMissing dates (last 30 days): {len(missing)}")
            for d in missing[:10]:
                print(f"  - {d} ({d.strftime('%A')})")
            if len(missing) > 10:
                print(f"  ... and {len(missing) - 10} more")
        else:
            print("\nNo missing dates in the last 30 days!")
        
        print("=" * 60 + "\n")


SUPABASE_DDL = """
-- ============================================================================
-- SUPABASE DDL FOR 3CX CALL RECORDS
-- Run this in Supabase SQL Editor (https://supabase.com/dashboard)
-- ============================================================================

-- Main call records table
CREATE TABLE IF NOT EXISTS call_records (
    id BIGSERIAL PRIMARY KEY,
    call_time TIMESTAMPTZ NOT NULL,
    call_id VARCHAR(64),
    call_date DATE NOT NULL,
    direction VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL,
    extension VARCHAR(10),
    employee_name VARCHAR(100),
    phone_number VARCHAR(20),
    caller_id_raw VARCHAR(255),
    ringing_seconds INT DEFAULT 0,
    talking_seconds INT DEFAULT 0,
    cost DECIMAL(10,4) DEFAULT 0,
    from_field VARCHAR(255),
    to_field VARCHAR(255),
    call_activity_details TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    source_file VARCHAR(255),
    CONSTRAINT unique_call UNIQUE (call_time, call_id, from_field, to_field)
);

CREATE INDEX IF NOT EXISTS idx_call_records_date ON call_records(call_date);
CREATE INDEX IF NOT EXISTS idx_call_records_direction ON call_records(direction);
CREATE INDEX IF NOT EXISTS idx_call_records_extension ON call_records(extension);
CREATE INDEX IF NOT EXISTS idx_call_records_phone ON call_records(phone_number);
CREATE INDEX IF NOT EXISTS idx_call_records_status ON call_records(status);
CREATE INDEX IF NOT EXISTS idx_call_records_employee ON call_records(employee_name);

-- Tracker table for self-healing
CREATE TABLE IF NOT EXISTS call_load_tracker (
    load_date DATE PRIMARY KEY,
    record_count INT,
    source VARCHAR(255),
    loaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- REPORTING VIEWS
-- ============================================================================

-- Outbound calls by salesperson
CREATE OR REPLACE VIEW v_outbound_by_salesperson AS
SELECT 
    call_date,
    extension,
    employee_name,
    phone_number,
    COUNT(*) as total_calls,
    SUM(CASE WHEN status = 'Answered' THEN 1 ELSE 0 END) as answered,
    SUM(CASE WHEN status = 'Unanswered' THEN 1 ELSE 0 END) as unanswered,
    ROUND(100.0 * SUM(CASE WHEN status = 'Answered' THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0), 1) as connect_rate,
    SUM(talking_seconds) as total_talk_seconds,
    AVG(talking_seconds) FILTER (WHERE status = 'Answered') as avg_talk_seconds
FROM call_records
WHERE direction = 'Outbound'
GROUP BY call_date, extension, employee_name, phone_number;

-- Inbound calls by employee
CREATE OR REPLACE VIEW v_inbound_by_employee AS
SELECT 
    call_date,
    extension,
    employee_name,
    COUNT(*) as total_calls,
    SUM(CASE WHEN status = 'Answered' THEN 1 ELSE 0 END) as answered,
    SUM(CASE WHEN status = 'Unanswered' THEN 1 ELSE 0 END) as missed,
    SUM(talking_seconds) as total_talk_seconds,
    AVG(talking_seconds) FILTER (WHERE status = 'Answered') as avg_talk_seconds,
    AVG(ringing_seconds) as avg_ring_seconds
FROM call_records
WHERE direction = 'Inbound'
  AND extension IS NOT NULL
  AND extension NOT IN ('801', '807', '808', '809')
GROUP BY call_date, extension, employee_name;

-- Daily summary
CREATE OR REPLACE VIEW v_daily_summary AS
SELECT 
    call_date,
    COUNT(*) as total_calls,
    SUM(CASE WHEN direction = 'Outbound' THEN 1 ELSE 0 END) as outbound,
    SUM(CASE WHEN direction = 'Inbound' THEN 1 ELSE 0 END) as inbound,
    SUM(CASE WHEN direction = 'Internal' THEN 1 ELSE 0 END) as internal,
    SUM(CASE WHEN status = 'Answered' THEN 1 ELSE 0 END) as answered,
    SUM(CASE WHEN status = 'Unanswered' THEN 1 ELSE 0 END) as unanswered,
    SUM(talking_seconds) / 60 as total_talk_minutes,
    SUM(cost) as total_cost
FROM call_records
GROUP BY call_date
ORDER BY call_date DESC;

-- Repeat callers
CREATE OR REPLACE VIEW v_repeat_callers AS
SELECT 
    phone_number,
    MIN(call_date) as first_call,
    MAX(call_date) as last_call,
    COUNT(*) as total_calls,
    COUNT(DISTINCT call_date) as days_called,
    SUM(talking_seconds) as total_talk_seconds
FROM call_records
WHERE direction = 'Inbound'
  AND phone_number IS NOT NULL
  AND LENGTH(phone_number) = 10
GROUP BY phone_number
HAVING COUNT(*) > 1
ORDER BY total_calls DESC;

-- Salesperson daily metrics (for dashboard)
CREATE OR REPLACE VIEW v_salesperson_daily AS
SELECT 
    call_date,
    extension,
    employee_name,
    SUM(CASE WHEN direction = 'Outbound' THEN 1 ELSE 0 END) as outbound_calls,
    SUM(CASE WHEN direction = 'Outbound' AND status = 'Answered' THEN 1 ELSE 0 END) as outbound_connected,
    SUM(CASE WHEN direction = 'Inbound' THEN 1 ELSE 0 END) as inbound_calls,
    SUM(CASE WHEN direction = 'Inbound' AND status = 'Answered' THEN 1 ELSE 0 END) as inbound_answered,
    SUM(talking_seconds) as total_talk_seconds,
    ROUND(SUM(talking_seconds) / 60.0, 1) as total_talk_minutes
FROM call_records
WHERE extension IS NOT NULL
  AND extension BETWEEN '100' AND '199'
GROUP BY call_date, extension, employee_name
ORDER BY call_date DESC, employee_name;
"""


def main():
    parser = argparse.ArgumentParser(
        description="3CX Call Data Processor - Automatic Self-Healing Loader"
    )
    parser.add_argument('--status', action='store_true',
                        help='Show data coverage status only (no loading)')
    parser.add_argument('--show-ddl', action='store_true',
                        help='Print Supabase DDL and exit')
    
    args = parser.parse_args()
    
    if args.show_ddl:
        print(SUPABASE_DDL)
        return
    
    processor = ThreeCXProcessor()
    
    if args.status:
        processor.show_status()
    else:
        # Automatic run - checks what's needed and loads it
        processor.run()


if __name__ == '__main__':
    main()