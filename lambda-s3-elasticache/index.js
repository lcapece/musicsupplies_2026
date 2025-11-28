const AWS = require('aws-sdk');
const redis = require('redis');
const { promisify } = require('util');

// Initialize AWS services
const s3 = new AWS.S3();

// Lambda handler
exports.handler = async (event) => {
    console.log('Lambda triggered by S3 event:', JSON.stringify(event, null, 2));
    
    // ElastiCache configuration
    const REDIS_ENDPOINT = process.env.REDIS_ENDPOINT || 'your-elasticache-endpoint.cache.amazonaws.com';
    const REDIS_PORT = process.env.REDIS_PORT || 6379;
    const BUCKET_NAME = 'mus86077';
    const CACHE_KEY = 's3:mus86077:files';
    
    // Create Redis client
    const redisClient = redis.createClient({
        host: REDIS_ENDPOINT,
        port: REDIS_PORT,
        retry_strategy: function (options) {
            if (options.error && options.error.code === 'ECONNREFUSED') {
                return new Error('The server refused the connection');
            }
            if (options.total_retry_time > 1000 * 60 * 60) {
                return new Error('Retry time exhausted');
            }
            if (options.attempt > 10) {
                return undefined;
            }
            return Math.min(options.attempt * 100, 3000);
        }
    });
    
    // Promisify Redis operations
    const setAsync = promisify(redisClient.set).bind(redisClient);
    const quitAsync = promisify(redisClient.quit).bind(redisClient);
    
    try {
        // Extract S3 event details
        for (const record of event.Records) {
            const eventName = record.eventName;
            const bucketName = record.s3.bucket.name;
            const objectKey = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));
            
            console.log(`Processing event: ${eventName} for object: ${objectKey} in bucket: ${bucketName}`);
            
            // Only process if it's the correct bucket
            if (bucketName !== BUCKET_NAME) {
                console.log(`Skipping event for bucket: ${bucketName}`);
                continue;
            }
            
            // List all objects in the bucket
            console.log(`Listing all objects in bucket: ${BUCKET_NAME}`);
            const allFiles = await listAllObjects(s3, BUCKET_NAME);
            
            // Prepare data for caching
            const cacheData = {
                timestamp: new Date().toISOString(),
                totalFiles: allFiles.length,
                lastModified: objectKey,
                eventType: eventName,
                files: allFiles.map(file => ({
                    key: file.Key,
                    size: file.Size,
                    lastModified: file.LastModified,
                    etag: file.ETag,
                    storageClass: file.StorageClass
                }))
            };
            
            // Store in ElastiCache
            console.log(`Storing ${allFiles.length} files in ElastiCache with key: ${CACHE_KEY}`);
            await setAsync(CACHE_KEY, JSON.stringify(cacheData));
            
            // Also store a TTL key with expiration (24 hours)
            await setAsync(`${CACHE_KEY}:ttl`, 'active', 'EX', 86400);
            
            console.log('Successfully updated ElastiCache with file list');
        }
        
        // Close Redis connection
        await quitAsync();
        
        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Successfully processed S3 event and updated ElastiCache'
            })
        };
        
    } catch (error) {
        console.error('Error processing S3 event:', error);
        
        // Attempt to close Redis connection on error
        try {
            await quitAsync();
        } catch (closeError) {
            console.error('Error closing Redis connection:', closeError);
        }
        
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: 'Error processing S3 event',
                error: error.message
            })
        };
    }
};

// Helper function to list all objects in a bucket
async function listAllObjects(s3, bucketName) {
    const allFiles = [];
    let continuationToken = null;
    
    do {
        const params = {
            Bucket: bucketName,
            MaxKeys: 1000
        };
        
        if (continuationToken) {
            params.ContinuationToken = continuationToken;
        }
        
        try {
            const response = await s3.listObjectsV2(params).promise();
            
            if (response.Contents) {
                allFiles.push(...response.Contents);
            }
            
            continuationToken = response.NextContinuationToken;
        } catch (error) {
            console.error('Error listing objects:', error);
            throw error;
        }
    } while (continuationToken);
    
    console.log(`Found ${allFiles.length} total files in bucket ${bucketName}`);
    return allFiles;
}