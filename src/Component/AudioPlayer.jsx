import { useState, useEffect, useRef } from "react";
import Marquee from "react-fast-marquee";
import { toast } from "react-toastify";

const AudioPlayer = () => {
  const [playlist, setPlaylist] = useState([]);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const audioRef = useRef(new Audio());
  const [isPlaying, setIsPlaying] = useState(false);
  useEffect(() => {
    const initIndexedDB = async () => {
      const db = await openDatabase();
      const storedPlaylist = await getAllItems(db, "playlist");
      setPlaylist(storedPlaylist);
      const lastPlayingAudio = await getItem(
        db,
        "settings",
        "lastPlayingAudio"
      );
      // Default values in case lastPlayingAudio is undefined
      const defaultTrackIndex = 0;
      const defaultPosition = 0;
      const { trackIndex = defaultTrackIndex, position = defaultPosition } =
        lastPlayingAudio || {};
      if (trackIndex !== undefined && position !== undefined) {
        setCurrentTrackIndex(trackIndex);
        if (storedPlaylist.length > 0 || playlist.length > 0) {
          const audioBlob = await getItem(
            db,
            "audioFiles",
            trackIndex.toString()
          );
          const audioObjectUrl = URL.createObjectURL(audioBlob);
          audioRef.current.src = audioObjectUrl;
          audioRef.current.currentTime = position;
          if (isPlaying) {
            try {
              await audioRef.current.play();
              console.log("After play:", audioRef.current.currentTime);
            } catch (error) {
              console.error("Failed to play audio:", error);
            }
          }
        }
      } else {
        const audioBlob = await getItem(db, "audioFiles");
        const audioObjectUrl = URL.createObjectURL(audioBlob);
        audioRef.current.src = audioObjectUrl;
        if (isPlaying) {
          try {
            await audioRef.current.play();
            console.log("After play:", audioRef.current.currentTime);
          } catch (error) {
            console.error("Failed to play audio:", error);
          }
        }
      }
    };
    initIndexedDB();
  }, [currentTrackIndex, isPlaying, playlist.length]);

  useEffect(() => {
    const saveLastPlayingAudio = async () => {
      const db = await openDatabase();

      // Update the last playing audio information
      const updateLastPlayingAudio = () => {
        const lastPlayingAudio = {
          trackIndex: currentTrackIndex,
          position: audioRef.current.currentTime,
        };
        window.localStorage.setItem(
          "playing",
          JSON.stringify(lastPlayingAudio)
        );
        putItem(db, "settings", "lastPlayingAudio", lastPlayingAudio);
      };

      // Add event listener for timeupdate
      audioRef.current.addEventListener("timeupdate", updateLastPlayingAudio);

      // If audio is already playing, trigger the event listener immediately
      if (isPlaying) {
        updateLastPlayingAudio();
      }

      // Remove the event listener when the component unmounts
      return () => {
        audioRef.current.removeEventListener(
          "timeupdate",
          updateLastPlayingAudio
        );
      };
    };
    saveLastPlayingAudio();
  }, [currentTrackIndex, isPlaying]);

  const handleFileChange = async (e) => {
    const files = e.target.files;
    if (files.length > 0) {
      const db = await openDatabase();
      const audioBlob = await fileToBlob(files[0]);
      const audioFileKey = playlist.length.toString();
      await Promise.all([
        putItem(db, "audioFiles", audioFileKey, audioBlob),
        putItem(db, "playlist", audioFileKey, {
          ...files[0],
          audioBlob: files[0].name,
        }),
      ]);
      const storedPlaylist = await getAllItems(db, "playlist");
      setPlaylist(storedPlaylist);
      setCurrentTrackIndex(playlist.length);
      setIsPlaying(true); // Set isPlaying to true when adding a new file
    }
  };

  const playNextTrack = () => {
    if (currentTrackIndex < playlist.length - 1) {
      setCurrentTrackIndex(currentTrackIndex + 1);
      setIsPlaying(true);
    } else {
      setCurrentTrackIndex(0);
      setIsPlaying(true);
    }
    audioRef.current.currentTime = 0;
  };

  const playPrevTrack = () => {
    if (currentTrackIndex > 0) {
      setCurrentTrackIndex(currentTrackIndex - 1);
      setIsPlaying(true);
    } else {
      setCurrentTrackIndex(playlist.length - 1);
      setIsPlaying(true);
    }
    audioRef.current.currentTime = 0;
  };

  useEffect(() => {
    const audio = audioRef.current;
    const handlePlay = () => {
      setIsPlaying(true);
    };
    const handlePause = () => {
      setIsPlaying(false);
    };
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    return () => {
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
    };
  }, [audioRef]);

  const handleEnded = () => {
    playNextTrack();
    toast.fire("Playlist Repeated");
  };
  const handleClick = (index) => {
    setCurrentTrackIndex(index);
    audioRef.current.play();
    setIsPlaying(true);
    audioRef.current.currentTime = 0;
  };
  return (
    <div>
      <div className="flex flex-col md:flex-row gap-5 m-5 items-center">
        <div className="w-2/3">
          <audio
            className="w-full"
            ref={audioRef}
            controls
            onEnded={handleEnded}
          />
          <div className="flex justify-evenly my-10">
            <button
              className="btn btn-accent btn-outline"
              onClick={playPrevTrack}
            >
              Prev
            </button>
            <button
              className="btn btn-accent"
              onClick={() => setIsPlaying(!isPlaying)}
            >
              {isPlaying ? "Pause" : "Play"}
            </button>
            <button
              className="btn btn-accent btn-outline"
              onClick={playNextTrack}
            >
              Next
            </button>
          </div>
          <p className="bg-base-200 p-5 rounded-md">
            <span className="font-semibold text-xl  ">Now Playing: </span>
            <span className="text-accent text-lg font-medium">
              {playlist[currentTrackIndex]?.audioBlob}
            </span>
          </p>
        </div>
        <div className="w-1/3">
          <div className="my-5">
            <p>Add your Song:</p>
            <input
              className="file-input file-input-bordered file-input-accent w-full mt-1"
              type="file"
              accept="audio/*"
              onChange={handleFileChange}
            />
          </div>
          <p>Playlist:</p>
          <ul>
            {playlist.map((file, index) => (
              <div key={index}>
                {currentTrackIndex === index ? (
                  <Marquee pauseOnHover={true}>
                    <li
                      className="my-2 btn btn-accent rounded-none"
                      onClick={() => handleClick(index)}
                    >
                      <span> {file.audioBlob}</span>
                    </li>
                  </Marquee>
                ) : (
                  <li
                    className=" my-2 btn  w-full truncate block pt-4"
                    onClick={() => handleClick(index)}
                  >
                    <span>
                      {index + 1}. {file.audioBlob}
                    </span>
                  </li>
                )}
              </div>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default AudioPlayer;

async function openDatabase() {
  const db = await new Promise((resolve, reject) => {
    const request = indexedDB.open("AudioPlayerDB", 1);
    request.onupgradeneeded = (event) => {
      event.preventDefault();
      const db = event.target.result;
      db.createObjectStore("audioFiles");
      db.createObjectStore("playlist");
      db.createObjectStore("settings");
    };

    request.onsuccess = (event) => {
      event.preventDefault();
      resolve(event.target.result);
    };

    request.onerror = (event) => {
      event.preventDefault();
      reject(event.target.error);
    };
  });

  return db;
}

async function putItem(db, storeName, key, value) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, "readwrite");
    const store = transaction.objectStore(storeName);
    const request = store.put(value, key);
    console.log(request);
    transaction.oncomplete = () => {
      resolve();
    };

    transaction.onerror = () => {
      reject(transaction.error);
    };
  });
}

async function getItem(db, storeName, key) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName);
    const store = transaction.objectStore(storeName);
    const request = store.get(key);
    request.onsuccess = (event) => {
      event.preventDefault();
      resolve(event.target.result);
    };

    request.onerror = (event) => {
      event.preventDefault();
      reject(request.error);
    };
  });
}

async function getAllItems(db, storeName) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName);
    const store = transaction.objectStore(storeName);
    const request = store.getAll();
    request.onsuccess = (event) => {
      event.preventDefault();
      resolve(event.target.result);
    };

    request.onerror = (event) => {
      event.preventDefault();
      reject(request.error);
    };
  });
}

async function fileToBlob(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      resolve(new Blob([reader.result]));
    };
    reader.readAsArrayBuffer(file);
  });
}
