import InfiniteGallery from "@/components/ui/3d-gallery-photography"

export default function Home() {
  // Fisher-Yates shuffle algorithm to randomize array
  const shuffleArray = <T,>(array: T[]): T[] => {
    const shuffled = [...array]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return shuffled
  }

  const allImages = [
    { src: "/images/001.jpeg", alt: "Portrait 1" },
    { src: "/images/002.jpeg", alt: "Portrait 2" },
    { src: "/images/003.jpeg", alt: "Portrait 3" },
    { src: "/images/004.jpeg", alt: "Portrait 4" },
    { src: "/images/005.jpeg", alt: "Portrait 5" },
    { src: "/images/006.jpeg", alt: "Portrait 6" },
    { src: "/images/007.jpeg", alt: "Portrait 7" },
    { src: "/images/008.jpeg", alt: "Portrait 8" },
    { src: "/images/009.jpeg", alt: "Portrait 9" },
    { src: "/images/010.jpeg", alt: "Portrait 10" },
    { src: "/images/011.jpeg", alt: "Portrait 11" },
    { src: "/images/012.jpeg", alt: "Portrait 12" },
    { src: "/images/013.jpeg", alt: "Portrait 13" },
    { src: "/images/014.jpeg", alt: "Portrait 14" },
    { src: "/images/015.jpeg", alt: "Portrait 15" },
    { src: "/images/016.jpeg", alt: "Portrait 16" },
    { src: "/images/017.jpeg", alt: "Portrait 17" },
    { src: "/images/018.jpeg", alt: "Portrait 18" },
    { src: "/images/019.jpeg", alt: "Portrait 19" },
    { src: "/images/020.jpeg", alt: "Portrait 20" },
    { src: "/images/021.jpeg", alt: "Portrait 21" },
    { src: "/images/022.jpeg", alt: "Portrait 22" },
    { src: "/images/023.jpeg", alt: "Portrait 23" },
    { src: "/images/024.jpeg", alt: "Portrait 24" },
    { src: "/images/025.jpeg", alt: "Portrait 25" },
    { src: "/images/026.jpeg", alt: "Portrait 26" },
    { src: "/images/027.jpeg", alt: "Portrait 27" },
    { src: "/images/028.jpeg", alt: "Portrait 28" },
    { src: "/images/029.jpeg", alt: "Portrait 29" },
    { src: "/images/030.jpeg", alt: "Portrait 30" },
    { src: "/images/031.JPG", alt: "Portrait 31" },
  ]

  // Randomize the order of images
  const sampleImages = shuffleArray(allImages)

  return (
    <main className="min-h-screen w-full">
      <InfiniteGallery
        images={sampleImages}
        speed={1.2}
        zSpacing={3}
        visibleCount={12}
        falloff={{ near: 0.8, far: 14 }}
        className="h-screen w-full rounded-lg overflow-hidden"
      />
      <div className="h-screen inset-0 pointer-events-none fixed flex items-center justify-center text-center px-3 mix-blend-exclusion text-white">
        <h1 className="font-serif text-4xl md:text-7xl tracking-tight">
          <span className="italic">I create;</span> therefore I am
        </h1>
      </div>

      <div className="text-center fixed bottom-10 left-0 right-0 font-mono uppercase text-[11px] font-semibold">
        <p>Use mouse wheel, arrow keys, or swipe to navigate</p>
        <p className="opacity-60">Auto-play resumes after 3 seconds of inactivity</p>
      </div>
    </main>
  )
}
