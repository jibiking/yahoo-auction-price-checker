'use client';

import { useState } from 'react';
import type { AuctionImage } from '@/types/auction';

type ImageGalleryProps = {
  images: AuctionImage[];
  title: string;
};

export default function ImageGallery({ images, title }: ImageGalleryProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  if (images.length === 0) {
    return (
      <div className="w-full h-64 bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg flex items-center justify-center border border-gray-700">
        <p className="text-gray-500 text-sm">画像なし</p>
      </div>
    );
  }

  // 1枚目の画像をサムネイルとして使用
  const thumbnailImage = images[0];

  const openGallery = (index: number) => {
    setCurrentIndex(index);
    setIsOpen(true);
  };

  const closeGallery = () => {
    setIsOpen(false);
  };

  const nextImage = () => {
    setCurrentIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  return (
    <>
      {/* サムネイル表示 */}
      <div className="relative group">
        <div
          className="w-full h-64 bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg overflow-hidden cursor-pointer border border-gray-700 hover:border-cyan-500 transition-all duration-300"
          onClick={() => openGallery(0)}
        >
          <img
            src={thumbnailImage.image}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </div>
        {images.length > 1 && (
          <div className="absolute top-2 right-2 bg-black/70 backdrop-blur-sm text-white px-3 py-1 rounded-full text-xs font-semibold border border-cyan-500/50">
            +{images.length - 1}枚
          </div>
        )}
      </div>

      {/* モーダル */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={closeGallery}
        >
          <button
            onClick={closeGallery}
            className="absolute top-4 right-4 text-white hover:text-cyan-400 transition-colors z-50"
          >
            <svg
              className="w-8 h-8"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>

          <div
            className="max-w-5xl w-full flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* メイン画像 */}
            <div className="relative w-full max-h-[70vh] flex items-center justify-center mb-4">
              <img
                src={images[currentIndex].image}
                alt={`${title} - ${currentIndex + 1}`}
                className="max-w-full max-h-[70vh] object-contain rounded-lg border border-cyan-500/30 shadow-2xl shadow-cyan-500/20"
              />

              {/* 前へボタン */}
              {images.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    prevImage();
                  }}
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/70 backdrop-blur-sm hover:bg-cyan-500/20 text-white p-3 rounded-full transition-all border border-cyan-500/50 hover:border-cyan-400"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                </button>
              )}

              {/* 次へボタン */}
              {images.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    nextImage();
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/70 backdrop-blur-sm hover:bg-cyan-500/20 text-white p-3 rounded-full transition-all border border-cyan-500/50 hover:border-cyan-400"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </button>
              )}
            </div>

            {/* インジケーター */}
            <div className="text-center text-gray-300 mb-4 bg-black/50 px-4 py-2 rounded-full border border-cyan-500/30">
              {currentIndex + 1} / {images.length}
            </div>

            {/* サムネイル一覧 */}
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto max-w-full pb-2">
                {images.map((img, index) => (
                  <button
                    key={index}
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentIndex(index);
                    }}
                    className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                      index === currentIndex
                        ? 'border-cyan-400 shadow-lg shadow-cyan-500/50'
                        : 'border-gray-600 hover:border-cyan-500/50 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={img.thumbnail}
                      alt={`Thumbnail ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
