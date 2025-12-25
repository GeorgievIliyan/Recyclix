"use client"

import { Camera as CameraIcon } from "lucide-react"
import { useRef, useState } from "react"

function Camera() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [cameraOn, setCameraOn] = useState(false)

  const startCamera = async () => {
    try{
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      })
      if (videoRef.current){
        videoRef.current.srcObject = stream
      }
      setCameraOn(true)
    }
    catch (err){
      console.error("Камерата не може да се отвори: ", err)
    }
  }

  const takePhoto = () => {
    if (!videoRef.current) return null

    const canvas = document.createElement('canvas')
    const video = videoRef.current

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    const ctx = canvas.getContext('2d')

    if (!ctx) return null

    ctx.drawImage(video, 0, 0)
    const photo = canvas.toDataURL('image/url')

    console.log("Photo taken: ", photo.substring(0,50))

    return photo
  }

  return (
    <div>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="w-full max-w-md border rounded-lg"
        style={{ display: cameraOn ? 'block' : 'none' }}
      />
      
      <div className="mt-2 space-x-2">
        <button 
          onClick={startCamera}
          className="bg-green-500 text-white px-4 py-2 rounded"
        >
          Включи камера
        </button>
        
        <button 
          onClick={takePhoto}
          disabled={!cameraOn}
          className="bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-50"
        >
          Засними
        </button>
      </div>
    </div>
  )
}

export default Camera
/*
  return (
    <div>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="w-full max-w-md border rounded-lg"
        style={{ display: cameraOn ? 'block' : 'none' }}
      />
      
      <div className="mt-2 space-x-2">
        <button 
          onClick={startCamera}
          className="bg-green-500 text-white px-4 py-2 rounded"
        >
          Включи камера
        </button>
        
        <button 
          onClick={takePhoto}
          disabled={!cameraOn}
          className="bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-50"
        >
          Засними
        </button>
      </div>
    </div>
  );
}
*/