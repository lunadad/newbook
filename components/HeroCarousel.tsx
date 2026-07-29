"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";

const SLIDES = [
  {
    src: "/reading-bear-hero.jpg",
    alt: "커다란 초록색 책을 읽으며 미소 짓는 크림색 곰",
    label: "곰의 독서 시간",
  },
  {
    src: "/reading-siamese-hero.jpg",
    alt: "커다란 초록색 책을 읽는 파란 눈의 샴고양이",
    label: "고양이의 독서 시간",
  },
];

export function HeroCarousel() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [interacting, setInteracting] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  const changeSlide = useCallback((direction: -1 | 1) => {
    setActive((current) => (current + direction + SLIDES.length) % SLIDES.length);
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncPreference = () => setReduceMotion(media.matches);

    syncPreference();
    media.addEventListener("change", syncPreference);
    return () => media.removeEventListener("change", syncPreference);
  }, []);

  useEffect(() => {
    if (paused || interacting || reduceMotion) return;

    const timer = window.setInterval(() => changeSlide(1), 6000);
    return () => window.clearInterval(timer);
  }, [changeSlide, interacting, paused, reduceMotion]);

  return (
    <section
      aria-roledescription="carousel"
      aria-label="독서 캐릭터"
      className="relative aspect-[4/3] overflow-hidden rounded-[28px] bg-[#f5f0e7] shadow-[0_12px_40px_rgba(24,32,28,0.08)] sm:aspect-[2/1]"
      onMouseEnter={() => setInteracting(true)}
      onMouseLeave={() => setInteracting(false)}
      onFocusCapture={() => setInteracting(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setInteracting(false);
      }}
    >
      <h1 className="sr-only">오늘 읽을 책을 가장 빠르게 발견하는 책 레이더</h1>

      {SLIDES.map((slide, index) => (
        <div
          key={slide.src}
          aria-hidden={active !== index}
          className={`absolute inset-0 transition-opacity duration-700 motion-reduce:transition-none ${
            active === index ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
        >
          <Image
            src={slide.src}
            alt={active === index ? slide.alt : ""}
            fill
            preload={index === 0}
            sizes="(max-width: 640px) calc(100vw - 32px), 976px"
            className="object-cover"
          />
        </div>
      ))}

      <p className="absolute left-4 top-4 z-10 rounded-full border border-white/70 bg-white/80 px-3.5 py-2 text-xs font-bold tracking-[-0.01em] text-foreground shadow-sm backdrop-blur sm:left-6 sm:top-6 sm:text-sm">
        오늘도 책과 함께
      </p>

      <button
        type="button"
        onClick={() => changeSlide(-1)}
        aria-label="이전 캐릭터 보기"
        className="absolute left-3 top-1/2 z-10 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-white/80 bg-white/85 text-xl font-medium text-foreground shadow-md backdrop-blur transition-transform hover:scale-105 active:scale-95 sm:left-5"
      >
        ←
      </button>

      <button
        type="button"
        onClick={() => changeSlide(1)}
        aria-label="다음 캐릭터 보기"
        className="absolute right-3 top-1/2 z-10 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-white/80 bg-white/85 text-xl font-medium text-foreground shadow-md backdrop-blur transition-transform hover:scale-105 active:scale-95 sm:right-5"
      >
        →
      </button>

      <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-white/70 bg-white/80 p-1.5 shadow-sm backdrop-blur sm:bottom-5">
        {SLIDES.map((slide, index) => (
          <button
            key={slide.src}
            type="button"
            onClick={() => setActive(index)}
            aria-label={slide.label}
            aria-current={active === index ? "true" : undefined}
            className="grid h-7 w-7 place-items-center rounded-full"
          >
            <span
              className={`block h-2 rounded-full transition-all ${
                active === index ? "w-4 bg-accent" : "w-2 bg-foreground-subtle/50"
              }`}
            />
          </button>
        ))}
        <span className="mx-0.5 h-4 w-px bg-border" aria-hidden="true" />
        <button
          type="button"
          onClick={() => setPaused((current) => !current)}
          aria-label={paused ? "자동 넘김 재생" : "자동 넘김 일시정지"}
          className="grid h-7 w-7 place-items-center rounded-full text-[10px] font-black text-foreground-muted hover:bg-white"
        >
          {paused ? "▶" : "Ⅱ"}
        </button>
      </div>
    </section>
  );
}
