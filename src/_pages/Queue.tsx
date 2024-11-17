import React, { useEffect, useState } from "react"
import ScreenshotQueue from "../components/ScreenshotQueue"
import axios from "axios"

interface Screenshot {
  path: string
  preview: string
}

const Queue: React.FC = () => {
  const [screenshots, setScreenshots] = useState<Screenshot[]>([])
  const [isProcessing, setIsProcessing] = useState(false)

  const handleDeleteScreenshot = async (index: number) => {
    const screenshotToDelete = screenshots[index]

    try {
      // Call the delete function exposed by Electron
      const response = await window.electronAPI.deleteScreenshot(
        screenshotToDelete.path
      )

      if (response.success) {
        // Update the state to remove the screenshot
        setScreenshots((prev) => prev.filter((_, i) => i !== index))
      } else {
        console.error("Failed to delete screenshot:", response.error)
        alert("Failed to delete the screenshot file.")
      }
    } catch (error) {
      console.error("Error deleting screenshot:", error)
      alert("An unexpected error occurred while deleting the screenshot.")
    }
  }
  const processScreenshots = async () => {
    if (screenshots.length === 0) {
      alert("No screenshots to process.")
      return
    }

    console.log("screenshots to process", screenshots)
    setIsProcessing(true)

    try {
      const formData = new FormData()

      screenshots.forEach((screenshot, index) => {
        formData.append(`image_${index}`, screenshot.path)
      })

      formData.append(
        "text_prompt",
        "Analyze the coding problem in the images and provide three possible solutions with different approaches and trade-offs. For each solution, include: \n" +
          "1. Initial thoughts: 2-3 first impressions and key observations about the problem\n" +
          "2. Thought steps: A natural progression of how you would think through implementing this solution, as if explaining to an interviewer\n" +
          "3. Detailed explanation of the approach and its trade-offs\n" +
          "4. Complete, well-commented code implementation\n" +
          "Structure the solutions from simplest/most intuitive to most optimized. Focus on clear explanation and clean code."
      )
      const response = await axios.post(
        "http://0.0.0.0:8000/process_images",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data"
          },
          timeout: 30000
        }
      )

      console.log("Processing response:", response.data)
      alert("Processing completed successfully!")
    } catch (error) {
      console.error("Error processing screenshots:", error)
      alert("Failed to process screenshots.")
    } finally {
      setIsProcessing(false)
    }
  }

  useEffect(() => {
    const loadScreenshots = async () => {
      try {
        const existing = await window.electronAPI.getScreenshots()
        setScreenshots(existing)
      } catch (error) {
        console.error("Error loading screenshots:", error)
      }
    }
    loadScreenshots()

    const handleKeyPress = async (e: KeyboardEvent) => {
      if (e.metaKey && e.shiftKey && (e.key === "h" || e.key === "H")) {
        try {
          const { path, preview } = await window.electronAPI.takeScreenshot()
          setScreenshots((prev) => [...prev, { path, preview }].slice(-10))
        } catch (error) {
          console.error("Error taking screenshot:", error)
        }
      }

      if (e.metaKey && e.shiftKey && (e.key === "j" || e.key === "J")) {
        processScreenshots()
      }
    }

    window.addEventListener("keydown", handleKeyPress)

    const cleanup = window.electronAPI.onScreenshotTaken((data) => {
      setScreenshots((prev) => [...prev, data].slice(-10))
    })

    return () => {
      window.removeEventListener("keydown", handleKeyPress)
      cleanup()
    }
  }, [screenshots])

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Screenshot Queue</h1>

        {isProcessing && (
          <div className="fixed top-4 left-4 bg-yellow-500 text-white px-4 py-2 rounded-lg shadow">
            Processing screenshots...
          </div>
        )}
        {screenshots.length > 0 && (
          <div>{screenshots[screenshots.length - 1].path}</div>
        )}
        <ScreenshotQueue
          screenshots={screenshots}
          onDeleteScreenshot={handleDeleteScreenshot}
        />
        <button
          onClick={processScreenshots}
          className="mt-4 px-4 py-2 bg-green-500 text-white rounded-lg shadow hover:bg-green-600 transition"
        >
          Process Screenshots
        </button>
        <p className="mt-4 text-sm text-gray-500">
          Press Cmd+Shift+H to take a screenshot. Latest 10 screenshots will be
          kept. <br />
          Press Cmd+Shift+J to process the screenshots.
        </p>
      </div>
    </div>
  )
}

export default Queue
