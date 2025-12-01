import React, { useState, useRef, useEffect } from 'react';

interface Track {
  title: string;
  file: string;
}

const volume1Tracks: Track[] = [
  { title: "Cry Me a River", file: "01 Cry me a River.mp3" },
  { title: "Here's the Rainy Day", file: "02 Here's the Rainy Day.mp3" },
  { title: "Moonlight in Vermont", file: "03 Moonlight in  Vermont.mp3" },
  { title: "Ain't Misbehavin", file: "04 Ain't Misbehavin.mp3" },
  { title: "I Remember You", file: "05 I Remeber You.mp3" },
  { title: "Angel Eyes", file: "06 Angel Eyes.mp3" },
  { title: "Moon River", file: "07 Moon River.mp3" },
  { title: "Somewhere Over the Rainbow", file: "08 Somewhere Over the Rainbow.mp3" },
  { title: "Desafinado", file: "09 Desafinido.mp3" },
  { title: "When Sonny Gets Blue", file: "10 When Sonny Gets Blue.mp3" },
  { title: "Georgia on My Mind", file: "11 Georgia on My Mind.mp3" },
  { title: "Four", file: "12 Four.mp3" },
  { title: "Satin Doll", file: "13 Satin Doll.mp3" },
  { title: "What's New", file: "14 What's New.mp3" },
  { title: "Girl From Ipanema", file: "15 Girl From Ipenema.mp3" },
  { title: "Theme from The Godfather", file: "16 Theme from The Godfather.mp3" },
  { title: "Sleepwalking", file: "17 Sleepwalking.mp3" },
  { title: "If", file: "18 If.mp3" },
  { title: "Lady is a Tramp", file: "19 Lady is a Tramp.mp3" },
  { title: "Misty", file: "20 Misty.mp3" },
  { title: "Our Day Will Come", file: "21 Our Day Will Come.mp3" },
  { title: "The Shadow of Your Smile", file: "22 The Shadow of Your Smile.mp3" },
  { title: "Green Dolphin Street", file: "23 Green Dolphin Street.mp3" },
  { title: "More", file: "24 More.mp3" },
  { title: "Sunny", file: "25 Sunny.mp3" },
  { title: "Wave", file: "26 Wave.mp3" },
  { title: "Someone to Watch Over Me", file: "27 Someone to Watch Over Me.mp3" }
];

const volume2Tracks: Track[] = [
  { title: "Two For The Road", file: "01 Two For The Road.mp3" },
  { title: "An Affair To Remember", file: "02 An Affair To Remember.mp3" },
  { title: "What Are You Doing The Rest Of Your Life", file: "03 What Are You Doing The Rest Of Your Life-.mp3" },
  { title: "Carnival", file: "04 Carnival.mp3" },
  { title: "There Will Never Be Another You", file: "05 There Will Never Be Another You.mp3" },
  { title: "Lullaby Of Birdland", file: "06 Lullaby Of Birdland.mp3" },
  { title: "Once I Loved", file: "07 Once I Loved.mp3" },
  { title: "Watch What Happens", file: "08 Watch What Happens.mp3" },
  { title: "Days Of Wine And Roses", file: "09 Days Of Wine And Roses.mp3" },
  { title: "Fly Me To The Moon", file: "10 Fly Me To The Moon.mp3" },
  { title: "Time After Time", file: "11 Time After Time.mp3" },
  { title: "Bye Bye Blackbird", file: "12 Bye Bye Blackbird.mp3" },
  { title: "Tenderly", file: "13 Tenderly.mp3" },
  { title: "What I Did For Love", file: "14 What I Did For Love.mp3" },
  { title: "Moonlight Becomes You", file: "15 Moonlight Becomes You.mp3" },
  { title: "I'm In The Mood For Love", file: "16 I'm In The Mood For Love.mp3" },
  { title: "If He Walked Into My Life", file: "17 If He Walked Into My Live.mp3" },
  { title: "When You Wish Upon A Star", file: "18 When You Wish Upon A Star.mp3" },
  { title: "I Thought About You", file: "19 I Thought About You.mp3" },
  { title: "Yesterday", file: "20 Yesterday.mp3" },
  { title: "Raindrops Keep Falling On My Head", file: "21 Raindrops Keep Falling On My Head.mp3" },
  { title: "Cheek To Cheek", file: "22 Cheek To Cheek.mp3" },
  { title: "April In Paris", file: "23 April In Paris.mp3" },
  { title: "Somewhere", file: "24 Somewhere.mp3" },
  { title: "Scotch And Soda", file: "25 Scotch And Soda.mp3" },
  { title: "Can't Help Falling In Love", file: "26 Can't Help Falling In Love.mp3" },
  { title: "Quiet Nights", file: "27 Quiet Nights.mp3" },
  { title: "This Guy's In Love With You", file: "28 This Guy's In Love With You.mp3" }
];

interface LouCapecePlayerProps {
  isOpen: boolean;
  onClose: () => void;
}

const LouCapecePlayer: React.FC<LouCapecePlayerProps> = ({ isOpen, onClose }) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [selectedVolume, setSelectedVolume] = useState<1 | 2>(1);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.7);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  const tracks = selectedVolume === 1 ? volume1Tracks : volume2Tracks;
  const currentTrack = tracks[currentTrackIndex];
  const basePath = selectedVolume === 1 ? '/media/Lou Capece Vol. 1/' : '/media/Lou Capece Vol. 2/';

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  useEffect(() => {
    // Reset track index when changing volumes
    setCurrentTrackIndex(0);
    setIsPlaying(false);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }, [selectedVolume]);

  useEffect(() => {
    if (audioRef.current && isPlaying) {
      audioRef.current.play().catch(console.error);
    }
  }, [currentTrackIndex]);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch(console.error);
      }
      setIsPlaying(!isPlaying);
    }
  };

  const playNext = () => {
    setCurrentTrackIndex((prev) => (prev + 1) % tracks.length);
  };

  const playPrevious = () => {
    setCurrentTrackIndex((prev) => (prev - 1 + tracks.length) % tracks.length);
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleEnded = () => {
    playNext();
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const selectTrack = (index: number) => {
    setCurrentTrackIndex(index);
    setIsPlaying(true);
    if (audioRef.current) {
      audioRef.current.play().catch(console.error);
    }
  };

  if (!isOpen) return null;

  // Minimized view - fixed at bottom of screen
  if (isMinimized) {
    return (
      <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-r from-amber-900 via-amber-800 to-amber-900 text-white shadow-2xl z-50 border-t-2 border-amber-600">
        <div className="max-w-7xl mx-auto px-4 py-2">
          <div className="flex items-center justify-between gap-4">
            {/* Track info */}
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 bg-amber-700 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                </svg>
              </div>
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">{currentTrack.title}</div>
                <div className="text-xs text-amber-200">Lou Capece - Vol. {selectedVolume}</div>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-2">
              <button onClick={playPrevious} className="p-2 hover:bg-amber-700 rounded-full transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/>
                </svg>
              </button>
              <button onClick={togglePlay} className="p-2 bg-amber-600 hover:bg-amber-500 rounded-full transition-colors">
                {isPlaying ? (
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
                  </svg>
                ) : (
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                )}
              </button>
              <button onClick={playNext} className="p-2 hover:bg-amber-700 rounded-full transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/>
                </svg>
              </button>
            </div>

            {/* Progress bar */}
            <div className="flex-1 hidden sm:flex items-center gap-2 max-w-md">
              <span className="text-xs text-amber-200 w-10">{formatTime(currentTime)}</span>
              <input
                type="range"
                min="0"
                max={duration || 100}
                value={currentTime}
                onChange={handleSeek}
                className="flex-1 h-1 bg-amber-700 rounded-lg appearance-none cursor-pointer accent-amber-400"
              />
              <span className="text-xs text-amber-200 w-10">{formatTime(duration)}</span>
            </div>

            {/* Volume */}
            <div className="hidden md:flex items-center gap-2">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
              </svg>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="w-20 h-1 bg-amber-700 rounded-lg appearance-none cursor-pointer accent-amber-400"
              />
            </div>

            {/* Expand/Close buttons */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsMinimized(false)}
                className="p-2 hover:bg-amber-700 rounded-full transition-colors"
                title="Expand player"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7"/>
                </svg>
              </button>
              <button
                onClick={onClose}
                className="p-2 hover:bg-red-600 rounded-full transition-colors"
                title="Close player"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
        <audio
          ref={audioRef}
          src={`${basePath}${encodeURIComponent(currentTrack.file)}`}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={handleEnded}
        />
      </div>
    );
  }

  // Full expanded view - modal overlay
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-amber-900 via-amber-800 to-amber-900 text-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-amber-700 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Lou Capece</h2>
            <p className="text-amber-200 text-sm">Jazz Guitar Classics</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsMinimized(true)}
              className="p-2 hover:bg-amber-700 rounded-full transition-colors"
              title="Minimize player"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
              </svg>
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-red-600 rounded-full transition-colors"
              title="Close player"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Volume selector */}
        <div className="px-6 py-3 bg-amber-800/50">
          <label className="text-sm text-amber-200 mr-3">Select Album:</label>
          <select
            value={selectedVolume}
            onChange={(e) => setSelectedVolume(parseInt(e.target.value) as 1 | 2)}
            className="bg-amber-700 text-white px-4 py-2 rounded-lg border border-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-400"
          >
            <option value={1}>Volume I - Jazz Guitar Classics</option>
            <option value={2}>Volume II - Jazz Guitar Classics</option>
          </select>
        </div>

        {/* Current track display */}
        <div className="px-6 py-4 bg-amber-800/30">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-amber-700 rounded-lg flex items-center justify-center shadow-lg">
              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
              </svg>
            </div>
            <div className="flex-1">
              <div className="text-xl font-semibold">{currentTrack.title}</div>
              <div className="text-amber-200">Lou Capece - Volume {selectedVolume}</div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-4">
            <input
              type="range"
              min="0"
              max={duration || 100}
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-2 bg-amber-700 rounded-lg appearance-none cursor-pointer accent-amber-400"
            />
            <div className="flex justify-between text-xs text-amber-200 mt-1">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-4 mt-4">
            <button onClick={playPrevious} className="p-3 hover:bg-amber-700 rounded-full transition-colors">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/>
              </svg>
            </button>
            <button onClick={togglePlay} className="p-4 bg-amber-600 hover:bg-amber-500 rounded-full transition-colors shadow-lg">
              {isPlaying ? (
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
                </svg>
              ) : (
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z"/>
                </svg>
              )}
            </button>
            <button onClick={playNext} className="p-3 hover:bg-amber-700 rounded-full transition-colors">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/>
              </svg>
            </button>
          </div>

          {/* Volume control */}
          <div className="flex items-center justify-center gap-3 mt-4">
            <svg className="w-5 h-5 text-amber-200" fill="currentColor" viewBox="0 0 24 24">
              <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
            </svg>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="w-32 h-2 bg-amber-700 rounded-lg appearance-none cursor-pointer accent-amber-400"
            />
          </div>
        </div>

        {/* Track list */}
        <div className="px-6 py-2 max-h-[300px] overflow-y-auto">
          <h3 className="text-sm font-semibold text-amber-200 mb-2">Track List</h3>
          <div className="space-y-1">
            {tracks.map((track, index) => (
              <button
                key={index}
                onClick={() => selectTrack(index)}
                className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center gap-3 ${
                  index === currentTrackIndex
                    ? 'bg-amber-600 text-white'
                    : 'hover:bg-amber-700/50 text-amber-100'
                }`}
              >
                <span className="text-sm text-amber-300 w-6">{index + 1}.</span>
                <span className="flex-1 truncate">{track.title}</span>
                {index === currentTrackIndex && isPlaying && (
                  <span className="flex gap-0.5">
                    <span className="w-1 h-3 bg-white rounded animate-pulse"></span>
                    <span className="w-1 h-4 bg-white rounded animate-pulse" style={{ animationDelay: '0.2s' }}></span>
                    <span className="w-1 h-2 bg-white rounded animate-pulse" style={{ animationDelay: '0.4s' }}></span>
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        <audio
          ref={audioRef}
          src={`${basePath}${encodeURIComponent(currentTrack.file)}`}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={handleEnded}
        />
      </div>
    </div>
  );
};

export default LouCapecePlayer;
