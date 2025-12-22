"use client"
import { useEffect } from "react"

export default function Map(){
    useEffect(() => {
        fetch("/api/map")
        .then(res => res.json())
        .then(data => {
            console.log("Bins: ", data)
        })
    }, [])

    return <div>Fetching logic</div>
}