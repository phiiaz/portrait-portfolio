'use client';

import type React from 'react';
import { useRef, useMemo, useCallback, useState, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';

type ImageItem = string | { src: string; alt?: string };

interface FadeSettings {
    /** Fade in range as percentage of depth range (0-1) */
    fadeIn: {
        start: number;
        end: number;
    };
    /** Fade out range as percentage of depth range (0-1) */
    fadeOut: {
        start: number;
        end: number;
    };
}

interface BlurSettings {
    /** Blur in range as percentage of depth range (0-1) */
    blurIn: {
        start: number;
        end: number;
    };
    /** Blur out range as percentage of depth range (0-1) */
    blurOut: {
        start: number;
        end: number;
    };
    /** Maximum blur amount (0-10, higher values = more blur) */
    maxBlur: number;
}

interface InfiniteGalleryProps {
    images: ImageItem[];
    /** Speed multiplier applied to scroll delta (default: 1) */
    speed?: number;
    /** Spacing between images along Z in world units (default: 2.5) */
    zSpacing?: number;
    /** Number of visible planes (default: clamp to images.length, min 8) */
    visibleCount?: number;
    /** Near/far distances for opacity/blur easing (default: { near: 0.5, far: 12 }) */
    falloff?: { near: number; far: number };
    /** Fade in/out settings with ranges based on depth range percentage (default: { fadeIn: { start: 0.05, end: 0.15 }, fadeOut: { start: 0.85, end: 0.95 } }) */
    fadeSettings?: FadeSettings;
    /** Blur in/out settings with ranges based on depth range percentage (default: { blurIn: { start: 0.0, end: 0.1 }, blurOut: { start: 0.9, end: 1.0 }, maxBlur: 3.0 }) */
    blurSettings?: BlurSettings;
    /** Optional className for outer container */
    className?: string;
    /** Optional style for outer container */
    style?: React.CSSProperties;
}

interface PlaneData {
    index: number;
    z: number;
    imageIndex: number;
    x: number;
    y: number; // Added y property for vertical positioning
}

const DEFAULT_DEPTH_RANGE = 50;
const MAX_HORIZONTAL_OFFSET = 8;
const MAX_VERTICAL_OFFSET = 8;

// Custom shader material for blur, opacity, and cloth folding effects
const createClothMaterial = () => {
    return new THREE.ShaderMaterial({
        transparent: true,
        uniforms: {
            map: { value: null },
            opacity: { value: 1.0 },
            blurAmount: { value: 0.0 },
            scrollForce: { value: 0.0 },
            time: { value: 0.0 },
            isHovered: { value: 0.0 },
        },
        vertexShader: `
      uniform float scrollForce;
      uniform float time;
      uniform float isHovered;
      varying vec2 vUv;
      varying vec3 vNormal;
      
      void main() {
        vUv = uv;
        vNormal = normal;
        
        vec3 pos = position;
        
        // Create smooth curving based on scroll force
        float curveIntensity = scrollForce * 0.3;
        
        // Base curve across the plane based on distance from center
        float distanceFromCenter = length(pos.xy);
        float curve = distanceFromCenter * distanceFromCenter * curveIntensity;
        
        // Add gentle cloth-like ripples
        float ripple1 = sin(pos.x * 2.0 + scrollForce * 3.0) * 0.02;
        float ripple2 = sin(pos.y * 2.5 + scrollForce * 2.0) * 0.015;
        float clothEffect = (ripple1 + ripple2) * abs(curveIntensity) * 2.0;
        
        // Flag waving effect when hovered
        float flagWave = 0.0;
        if (isHovered > 0.5) {
          // Create flag-like wave from left to right
          float wavePhase = pos.x * 3.0 + time * 8.0;
          float waveAmplitude = sin(wavePhase) * 0.1;
          // Damping effect - stronger wave on the right side (free edge)
          float dampening = smoothstep(-0.5, 0.5, pos.x);
          flagWave = waveAmplitude * dampening;
          
          // Add secondary smaller waves for more realistic flag motion
          float secondaryWave = sin(pos.x * 5.0 + time * 12.0) * 0.03 * dampening;
          flagWave += secondaryWave;
        }
        
        // Apply Z displacement for curving effect (inverted) with cloth ripples and flag wave
        pos.z -= (curve + clothEffect + flagWave);
        
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
      }
    `,
        fragmentShader: `
      uniform sampler2D map;
      uniform float opacity;
      uniform float blurAmount;
      uniform float scrollForce;
      varying vec2 vUv;
      varying vec3 vNormal;
      
      void main() {
        vec4 color = texture2D(map, vUv);
        
        // Simple blur approximation
        if (blurAmount > 0.0) {
          vec2 texelSize = 1.0 / vec2(textureSize(map, 0));
          vec4 blurred = vec4(0.0);
          float total = 0.0;
          
          for (float x = -2.0; x <= 2.0; x += 1.0) {
            for (float y = -2.0; y <= 2.0; y += 1.0) {
              vec2 offset = vec2(x, y) * texelSize * blurAmount;
              float weight = 1.0 / (1.0 + length(vec2(x, y)));
              blurred += texture2D(map, vUv + offset) * weight;
              total += weight;
            }
          }
          color = blurred / total;
        }
        
        // Add subtle lighting effect based on curving
        float curveHighlight = abs(scrollForce) * 0.05;
        color.rgb += vec3(curveHighlight * 0.1);
        
        gl_FragColor = vec4(color.rgb, color.a * opacity);
      }
    `,
    });
};

function ImagePlane({
    texture,
    position,
    scale,
    material,
    onClick,
}: {
    texture: THREE.Texture;
    position: [number, number, number];
    scale: [number, number, number];
    material: THREE.ShaderMaterial;
    onClick?: () => void;
}) {
    const meshRef = useRef<THREE.Mesh>(null);
    const [isHovered, setIsHovered] = useState(false);

    useEffect(() => {
        if (material && texture) {
            material.uniforms.map.value = texture;
        }
    }, [material, texture]);

    useEffect(() => {
        if (material && material.uniforms) {
            material.uniforms.isHovered.value = isHovered ? 1.0 : 0.0;
        }
    }, [material, isHovered]);

    return (
        <mesh
            ref={meshRef}
            position={position}
            scale={scale}
            material={material}
            onPointerEnter={() => setIsHovered(true)}
            onPointerLeave={() => setIsHovered(false)}
            onClick={onClick}
        >
            <planeGeometry args={[1, 1, 32, 32]} />
        </mesh>
    );
}

function GalleryScene({
    images,
    speed = 1,
    visibleCount = 8,
    fadeSettings = {
        fadeIn: { start: 0.05, end: 0.15 },
        fadeOut: { start: 0.85, end: 0.95 },
    },
    blurSettings = {
        blurIn: { start: 0.0, end: 0.1 },
        blurOut: { start: 0.9, end: 1.0 },
        maxBlur: 3.0,
    },
    onImageClick,
}: Omit<InfiniteGalleryProps, 'className' | 'style'> & { onImageClick?: (index: number) => void }) {
    const [scrollVelocity, setScrollVelocity] = useState(0);
    const [autoPlay, setAutoPlay] = useState(true);
    const lastInteraction = useRef(Date.now());

    // Normalize images to objects
    const normalizedImages = useMemo(
        () =>
            images.map((img) =>
                typeof img === 'string' ? { src: img, alt: '' } : img
            ),
        [images]
    );

    // Load textures
    const textures = useTexture(normalizedImages.map((img) => img.src));

    // Create materials pool
    const materials = useMemo(
        () => Array.from({ length: visibleCount }, () => createClothMaterial()),
        [visibleCount]
    );

    const spatialPositions = useMemo(() => {
        const positions: { x: number; y: number }[] = [];
        const maxHorizontalOffset = MAX_HORIZONTAL_OFFSET;
        const maxVerticalOffset = MAX_VERTICAL_OFFSET;

        for (let i = 0; i < visibleCount; i++) {
            // Create varied distribution patterns for both axes
            const horizontalAngle = (i * 2.618) % (Math.PI * 2); // Golden angle for natural distribution
            const verticalAngle = (i * 1.618 + Math.PI / 3) % (Math.PI * 2); // Offset angle for vertical

            const horizontalRadius = (i % 3) * 1.2; // Vary the distance from center
            const verticalRadius = ((i + 1) % 4) * 0.8; // Different pattern for vertical

            const x =
                (Math.sin(horizontalAngle) * horizontalRadius * maxHorizontalOffset) /
                3;
            const y =
                (Math.cos(verticalAngle) * verticalRadius * maxVerticalOffset) / 4;

            positions.push({ x, y });
        }

        return positions;
    }, [visibleCount]);

    const totalImages = normalizedImages.length;
    const depthRange = DEFAULT_DEPTH_RANGE;

    // Initialize plane data
    const planesData = useRef<PlaneData[]>(
        Array.from({ length: visibleCount }, (_, i) => ({
            index: i,
            z: visibleCount > 0 ? ((depthRange / visibleCount) * i) % depthRange : 0,
            imageIndex: totalImages > 0 ? i % totalImages : 0,
            x: spatialPositions[i]?.x ?? 0, // Use spatial positions for x
            y: spatialPositions[i]?.y ?? 0, // Use spatial positions for y
        }))
    );

    useEffect(() => {
        planesData.current = Array.from({ length: visibleCount }, (_, i) => ({
            index: i,
            z:
                visibleCount > 0
                    ? ((depthRange / Math.max(visibleCount, 1)) * i) % depthRange
                    : 0,
            imageIndex: totalImages > 0 ? i % totalImages : 0,
            x: spatialPositions[i]?.x ?? 0,
            y: spatialPositions[i]?.y ?? 0,
        }));
    }, [depthRange, spatialPositions, totalImages, visibleCount]);

    // Handle scroll input
    const handleWheel = useCallback(
        (event: WheelEvent) => {
            event.preventDefault();
            setScrollVelocity((prev) => prev + event.deltaY * 0.01 * speed);
            setAutoPlay(false);
            lastInteraction.current = Date.now();
        },
        [speed]
    );

    // Handle keyboard input
    const handleKeyDown = useCallback(
        (event: KeyboardEvent) => {
            if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
                setScrollVelocity((prev) => prev - 2 * speed);
                setAutoPlay(false);
                lastInteraction.current = Date.now();
            } else if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
                setScrollVelocity((prev) => prev + 2 * speed);
                setAutoPlay(false);
                lastInteraction.current = Date.now();
            }
        },
        [speed]
    );

    // Handle touch input for mobile
    const touchStart = useRef<{ x: number; y: number; time: number } | null>(null);

    const handleTouchStart = useCallback((event: TouchEvent) => {
        const touch = event.touches[0];
        if (touch) {
            touchStart.current = {
                x: touch.clientX,
                y: touch.clientY,
                time: Date.now(),
            };
        }
    }, []);

    const handleTouchMove = useCallback(
        (event: TouchEvent) => {
            if (!touchStart.current) return;

            const touch = event.touches[0];
            if (!touch) return;

            const deltaY = touchStart.current.y - touch.clientY;
            const deltaX = touchStart.current.x - touch.clientX;

            // Only handle vertical swipes (ignore horizontal)
            if (Math.abs(deltaY) > Math.abs(deltaX)) {
                event.preventDefault();
                setScrollVelocity((prev) => prev + deltaY * 0.05 * speed);
                setAutoPlay(false);
                lastInteraction.current = Date.now();

                // Update touch start for continuous swiping
                touchStart.current = {
                    x: touch.clientX,
                    y: touch.clientY,
                    time: Date.now(),
                };
            }
        },
        [speed]
    );

    const handleTouchEnd = useCallback(() => {
        touchStart.current = null;
    }, []);

    useEffect(() => {
        const canvas = document.querySelector('canvas');
        if (canvas) {
            // Mouse wheel
            canvas.addEventListener('wheel', handleWheel, { passive: false });

            // Keyboard
            document.addEventListener('keydown', handleKeyDown);

            // Touch events for mobile
            canvas.addEventListener('touchstart', handleTouchStart, { passive: true });
            canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
            canvas.addEventListener('touchend', handleTouchEnd, { passive: true });

            return () => {
                canvas.removeEventListener('wheel', handleWheel);
                document.removeEventListener('keydown', handleKeyDown);
                canvas.removeEventListener('touchstart', handleTouchStart);
                canvas.removeEventListener('touchmove', handleTouchMove);
                canvas.removeEventListener('touchend', handleTouchEnd);
            };
        }
    }, [handleWheel, handleKeyDown, handleTouchStart, handleTouchMove, handleTouchEnd]);

    // Auto-play logic
    useEffect(() => {
        const interval = setInterval(() => {
            if (Date.now() - lastInteraction.current > 3000) {
                setAutoPlay(true);
            }
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    useFrame((state, delta) => {
        // Apply auto-play
        if (autoPlay) {
            setScrollVelocity((prev) => prev + 0.3 * delta);
        }

        // Damping
        setScrollVelocity((prev) => prev * 0.95);

        // Update time uniform for all materials
        const time = state.clock.getElapsedTime();
        materials.forEach((material) => {
            if (material && material.uniforms) {
                material.uniforms.time.value = time;
                material.uniforms.scrollForce.value = scrollVelocity;
            }
        });

        // Update plane positions
        const imageAdvance =
            totalImages > 0 ? visibleCount % totalImages || totalImages : 0;
        const totalRange = depthRange;
        const halfRange = totalRange / 2;

        planesData.current.forEach((plane, i) => {
            let newZ = plane.z + scrollVelocity * delta * 10;
            let wrapsForward = 0;
            let wrapsBackward = 0;

            if (newZ >= totalRange) {
                wrapsForward = Math.floor(newZ / totalRange);
                newZ -= totalRange * wrapsForward;
            } else if (newZ < 0) {
                wrapsBackward = Math.ceil(-newZ / totalRange);
                newZ += totalRange * wrapsBackward;
            }

            if (wrapsForward > 0 && imageAdvance > 0 && totalImages > 0) {
                plane.imageIndex =
                    (plane.imageIndex + wrapsForward * imageAdvance) % totalImages;
            }

            if (wrapsBackward > 0 && imageAdvance > 0 && totalImages > 0) {
                const step = plane.imageIndex - wrapsBackward * imageAdvance;
                plane.imageIndex = ((step % totalImages) + totalImages) % totalImages;
            }

            plane.z = ((newZ % totalRange) + totalRange) % totalRange;
            plane.x = spatialPositions[i]?.x ?? 0;
            plane.y = spatialPositions[i]?.y ?? 0;

            const worldZ = plane.z - halfRange;

            // Calculate opacity based on fade settings
            const normalizedPosition = plane.z / totalRange; // 0 to 1
            let opacity = 1;

            if (
                normalizedPosition >= fadeSettings.fadeIn.start &&
                normalizedPosition <= fadeSettings.fadeIn.end
            ) {
                // Fade in: opacity goes from 0 to 1 within the fade in range
                const fadeInProgress =
                    (normalizedPosition - fadeSettings.fadeIn.start) /
                    (fadeSettings.fadeIn.end - fadeSettings.fadeIn.start);
                opacity = fadeInProgress;
            } else if (normalizedPosition < fadeSettings.fadeIn.start) {
                // Before fade in starts: fully transparent
                opacity = 0;
            } else if (
                normalizedPosition >= fadeSettings.fadeOut.start &&
                normalizedPosition <= fadeSettings.fadeOut.end
            ) {
                // Fade out: opacity goes from 1 to 0 within the fade out range
                const fadeOutProgress =
                    (normalizedPosition - fadeSettings.fadeOut.start) /
                    (fadeSettings.fadeOut.end - fadeSettings.fadeOut.start);
                opacity = 1 - fadeOutProgress;
            } else if (normalizedPosition > fadeSettings.fadeOut.end) {
                // After fade out ends: fully transparent
                opacity = 0;
            }

            // Clamp opacity between 0 and 1
            opacity = Math.max(0, Math.min(1, opacity));

            // Calculate blur based on blur settings
            let blur = 0;

            if (
                normalizedPosition >= blurSettings.blurIn.start &&
                normalizedPosition <= blurSettings.blurIn.end
            ) {
                // Blur in: blur goes from maxBlur to 0 within the blur in range
                const blurInProgress =
                    (normalizedPosition - blurSettings.blurIn.start) /
                    (blurSettings.blurIn.end - blurSettings.blurIn.start);
                blur = blurSettings.maxBlur * (1 - blurInProgress);
            } else if (normalizedPosition < blurSettings.blurIn.start) {
                // Before blur in starts: full blur
                blur = blurSettings.maxBlur;
            } else if (
                normalizedPosition >= blurSettings.blurOut.start &&
                normalizedPosition <= blurSettings.blurOut.end
            ) {
                // Blur out: blur goes from 0 to maxBlur within the blur out range
                const blurOutProgress =
                    (normalizedPosition - blurSettings.blurOut.start) /
                    (blurSettings.blurOut.end - blurSettings.blurOut.start);
                blur = blurSettings.maxBlur * blurOutProgress;
            } else if (normalizedPosition > blurSettings.blurOut.end) {
                // After blur out ends: full blur
                blur = blurSettings.maxBlur;
            }

            // Clamp blur to reasonable values
            blur = Math.max(0, Math.min(blurSettings.maxBlur, blur));

            // Update material uniforms
            const material = materials[i];
            if (material && material.uniforms) {
                material.uniforms.opacity.value = opacity;
                material.uniforms.blurAmount.value = blur;
            }
        });
    });

    if (normalizedImages.length === 0) return null;

    return (
        <>
            {planesData.current.map((plane, i) => {
                const texture = textures[plane.imageIndex];
                const material = materials[i];

                if (!texture || !material) return null;

                const worldZ = plane.z - depthRange / 2;

                // Calculate scale to maintain aspect ratio
                const img = texture.image as any;
                const aspect = img?.width && img?.height ? img.width / img.height : 1;
                const scale: [number, number, number] =
                    aspect > 1 ? [2 * aspect, 2, 1] : [2, 2 / aspect, 1];

                return (
                    <ImagePlane
                        key={plane.index}
                        texture={texture}
                        position={[plane.x, plane.y, worldZ]} // Position planes relative to camera center
                        scale={scale}
                        material={material}
                        onClick={() => onImageClick?.(plane.imageIndex)}
                    />
                );
            })}
        </>
    );
}

// Fallback component for when WebGL is not available
function FallbackGallery({ images }: { images: ImageItem[] }) {
    const normalizedImages = useMemo(
        () =>
            images.map((img) =>
                typeof img === 'string' ? { src: img, alt: '' } : img
            ),
        [images]
    );

    return (
        <div className="flex flex-col items-center justify-center h-full bg-gray-100 p-4">
            <p className="text-gray-600 mb-4">
                WebGL not supported. Showing image list:
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
                {normalizedImages.map((img, i) => (
                    <img
                        key={i}
                        src={img.src || '/placeholder.svg'}
                        alt={img.alt}
                        className="w-full h-32 object-cover rounded"
                    />
                ))}
            </div>
        </div>
    );
}

export default function InfiniteGallery({
    images,
    className = 'h-96 w-full',
    style,
    fadeSettings = {
        fadeIn: { start: 0.05, end: 0.25 },
        fadeOut: { start: 0.4, end: 0.43 },
    },
    blurSettings = {
        blurIn: { start: 0.0, end: 0.1 },
        blurOut: { start: 0.4, end: 0.43 },
        maxBlur: 8.0,
    },
}: InfiniteGalleryProps) {
    const [webglSupported, setWebglSupported] = useState(true);
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [lightboxIndex, setLightboxIndex] = useState(0);

    // Normalize images to objects
    const normalizedImages = useMemo(
        () =>
            images.map((img) =>
                typeof img === 'string' ? { src: img, alt: '' } : img
            ),
        [images]
    );

    useEffect(() => {
        // Check WebGL support
        try {
            const canvas = document.createElement('canvas');
            const gl =
                canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            if (!gl) {
                setWebglSupported(false);
            }
        } catch (e) {
            setWebglSupported(false);
        }
    }, []);

    // Prevent body scroll when lightbox is open
    useEffect(() => {
        if (lightboxOpen) {
            // Save current scroll position
            const scrollY = window.scrollY;
            document.body.style.overflow = 'hidden';
            document.body.style.position = 'fixed';
            document.body.style.top = `-${scrollY}px`;
            document.body.style.width = '100%';
        } else {
            // Restore scroll position
            const scrollY = document.body.style.top;
            document.body.style.overflow = '';
            document.body.style.position = '';
            document.body.style.top = '';
            document.body.style.width = '';
            window.scrollTo(0, parseInt(scrollY || '0') * -1);
        }
    }, [lightboxOpen]);

    // Lightbox keyboard navigation
    useEffect(() => {
        if (!lightboxOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setLightboxOpen(false);
            } else if (e.key === 'ArrowLeft') {
                setLightboxIndex((prev) =>
                    prev === 0 ? normalizedImages.length - 1 : prev - 1
                );
            } else if (e.key === 'ArrowRight') {
                setLightboxIndex((prev) =>
                    prev === normalizedImages.length - 1 ? 0 : prev + 1
                );
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [lightboxOpen, normalizedImages.length]);

    // Lightbox touch/swipe navigation
    useEffect(() => {
        if (!lightboxOpen) return;

        let touchStartX = 0;
        let touchStartY = 0;
        let touchEndX = 0;
        let touchEndY = 0;

        const handleTouchStart = (e: TouchEvent) => {
            touchStartX = e.changedTouches[0].screenX;
            touchStartY = e.changedTouches[0].screenY;
        };

        const handleTouchEnd = (e: TouchEvent) => {
            touchEndX = e.changedTouches[0].screenX;
            touchEndY = e.changedTouches[0].screenY;
            handleSwipe();
        };

        const handleSwipe = () => {
            const deltaX = touchEndX - touchStartX;
            const deltaY = touchEndY - touchStartY;
            const minSwipeDistance = 50;

            // Only handle horizontal swipes (ignore vertical)
            if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > minSwipeDistance) {
                if (deltaX > 0) {
                    // Swipe right - go to previous image
                    setLightboxIndex((prev) =>
                        prev === 0 ? normalizedImages.length - 1 : prev - 1
                    );
                } else {
                    // Swipe left - go to next image
                    setLightboxIndex((prev) =>
                        prev === normalizedImages.length - 1 ? 0 : prev + 1
                    );
                }
            }
        };

        window.addEventListener('touchstart', handleTouchStart);
        window.addEventListener('touchend', handleTouchEnd);

        return () => {
            window.removeEventListener('touchstart', handleTouchStart);
            window.removeEventListener('touchend', handleTouchEnd);
        };
    }, [lightboxOpen, normalizedImages.length]);

    const openLightbox = useCallback((index: number) => {
        setLightboxIndex(index);
        setLightboxOpen(true);
    }, []);

    const closeLightbox = useCallback(() => {
        setLightboxOpen(false);
    }, []);

    if (!webglSupported) {
        return (
            <div className={className} style={style}>
                <FallbackGallery images={images} />
            </div>
        );
    }

    return (
        <>
            <div className={className} style={style}>
                <Canvas
                    camera={{ position: [0, 0, 0], fov: 55 }}
                    gl={{ antialias: true, alpha: true }}
                >
                    <GalleryScene
                        images={images}
                        fadeSettings={fadeSettings}
                        blurSettings={blurSettings}
                        onImageClick={openLightbox}
                    />
                </Canvas>
            </div>

            {/* Lightbox */}
            {lightboxOpen && (
                <div
                    className="fixed inset-0 z-50 bg-black bg-opacity-95 flex items-center justify-center overflow-hidden"
                    style={{ touchAction: 'none' }}
                    onClick={closeLightbox}
                >
                    {/* Close button */}
                    <button
                        onClick={closeLightbox}
                        className="absolute top-4 right-4 md:top-8 md:right-8 text-white text-4xl md:text-5xl font-light hover:text-gray-300 transition-colors z-10 w-12 h-12 flex items-center justify-center"
                        aria-label="Close lightbox"
                    >
                        ×
                    </button>

                    {/* Image */}
                    <img
                        src={normalizedImages[lightboxIndex]?.src}
                        alt={normalizedImages[lightboxIndex]?.alt || 'Fullscreen image'}
                        className="max-w-[90vw] max-h-[90vh] object-contain"
                        onClick={(e) => e.stopPropagation()}
                    />

                    {/* Navigation arrows */}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setLightboxIndex((prev) =>
                                prev === 0 ? normalizedImages.length - 1 : prev - 1
                            );
                        }}
                        className="absolute left-4 md:left-8 text-white text-4xl md:text-5xl font-light hover:text-gray-300 transition-colors"
                        aria-label="Previous image"
                    >
                        ‹
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setLightboxIndex((prev) =>
                                prev === normalizedImages.length - 1 ? 0 : prev + 1
                            );
                        }}
                        className="absolute right-4 md:right-8 text-white text-4xl md:text-5xl font-light hover:text-gray-300 transition-colors"
                        aria-label="Next image"
                    >
                        ›
                    </button>

                    {/* Image counter */}
                    <div className="absolute bottom-4 md:bottom-8 left-1/2 transform -translate-x-1/2 text-white text-sm md:text-base">
                        {lightboxIndex + 1} / {normalizedImages.length}
                    </div>
                </div>
            )}
        </>
    );
}
