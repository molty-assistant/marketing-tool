'use client';

import { useState } from 'react';

export interface AppStoreData {
  icon?: string;
  name: string;
  subtitle?: string;
  screenshots?: string[];
  rating?: number;
  ratingCount?: number;
  description: string;
  whatsNew?: string;
  developer?: string;
  category?: string;
  pricing?: string;
  featureBullets?: string;
}

function StarRating({ rating }: { rating: number }) {
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    const fill = Math.min(1, Math.max(0, rating - (i - 1)));
    stars.push(
      <span key={i} className="relative inline-block w-[14px] h-[14px]">
        <span className="absolute inset-0 text-[14px] leading-none text-gray-300">★</span>
        <span
          className="absolute inset-0 text-[14px] leading-none text-orange-400 overflow-hidden"
          style={{ width: `${fill * 100}%` }}
        >
          ★
        </span>
      </span>
    );
  }
  return <span className="inline-flex gap-[1px]">{stars}</span>;
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

export default function AppStorePreview({ data }: { data: AppStoreData }) {
  const [descExpanded, setDescExpanded] = useState(false);
  const descTruncLen = 200;
  const needsTruncate = data.description.length > descTruncLen;
  const displayDesc = descExpanded || !needsTruncate
    ? data.description
    : data.description.slice(0, descTruncLen) + '…';

  return (
    <div className="max-w-[428px] mx-auto bg-[#f2f2f7] rounded-[20px] overflow-hidden font-[-apple-system,BlinkMacSystemFont,'SF_Pro_Display','Segoe_UI',sans-serif] text-[#1c1c1e]">
      {/* Header: Icon + Name + Get button */}
      <div className="bg-white px-5 pt-5 pb-4">
        <div className="flex gap-4 items-start">
          {/* App Icon */}
          <div className="w-[118px] h-[118px] rounded-[26px] overflow-hidden bg-gray-200 flex-shrink-0 shadow-sm">
            {data.icon ? (
              <img src={data.icon} alt={data.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-4xl text-gray-400">📱</div>
            )}
          </div>

          <div className="flex-1 min-w-0 pt-1">
            <h1 className="text-[20px] font-bold leading-tight line-clamp-2">{data.name}</h1>
            {data.subtitle && (
              <p className="text-[15px] text-gray-500 mt-0.5 line-clamp-1">{data.subtitle}</p>
            )}
            {data.developer && (
              <p className="text-[13px] text-[#007aff] mt-1 line-clamp-1">{data.developer}</p>
            )}
            <div className="mt-3">
              <button className="bg-[#007aff] text-white text-[15px] font-bold rounded-full px-7 py-[6px]">
                GET
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <div className="bg-white px-5 py-3 border-t border-[#e5e5ea] flex items-center justify-between text-center">
        <div className="flex-1">
          <div className="flex items-center justify-center gap-1">
            <span className="text-[15px] font-bold text-gray-500">
              {data.rating?.toFixed(1) ?? '—'}
            </span>
            {data.rating != null && <StarRating rating={data.rating} />}
          </div>
          <div className="text-[11px] text-gray-400 mt-0.5">
            {data.ratingCount != null ? `${formatCount(data.ratingCount)} Ratings` : 'No Ratings'}
          </div>
        </div>
        <div className="w-px h-8 bg-[#e5e5ea]" />
        <div className="flex-1">
          <div className="text-[15px] font-bold text-gray-500">{data.category || '—'}</div>
          <div className="text-[11px] text-gray-400 mt-0.5">Category</div>
        </div>
        <div className="w-px h-8 bg-[#e5e5ea]" />
        <div className="flex-1">
          <div className="text-[15px] font-bold text-gray-500">
            {data.pricing === 'Free' || data.pricing === 'free' ? 'Free' : data.pricing || 'Free'}
          </div>
          <div className="text-[11px] text-gray-400 mt-0.5">Price</div>
        </div>
      </div>

      {/* Screenshots */}
      {data.screenshots && data.screenshots.length > 0 && (
        <div className="bg-white mt-2 py-4">
          <h2 className="text-[20px] font-bold px-5 mb-3">Preview</h2>
          <div className="flex gap-3 overflow-x-auto px-5 pb-2 scrollbar-hide">
            {data.screenshots.map((src, i) => (
              <div
                key={i}
                className="flex-shrink-0 w-[200px] h-[355px] rounded-[18px] overflow-hidden bg-gray-200 shadow-sm"
              >
                <img
                  src={src}
                  alt={`Screenshot ${i + 1}`}
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Description */}
      <div className="bg-white mt-2 px-5 py-4">
        <h2 className="text-[20px] font-bold mb-2">Description</h2>
        <p className="text-[15px] leading-relaxed text-gray-700 whitespace-pre-line">
          {displayDesc}
          {needsTruncate && !descExpanded && (
            <button
              onClick={() => setDescExpanded(true)}
              className="text-[#007aff] font-medium ml-1"
            >
              more
            </button>
          )}
        </p>
        {descExpanded && needsTruncate && (
          <button
            onClick={() => setDescExpanded(false)}
            className="text-[#007aff] font-medium text-[15px] mt-1"
          >
            less
          </button>
        )}
      </div>

      {/* Feature Bullets */}
      {data.featureBullets && (
        <div className="bg-white mt-2 px-5 py-4">
          <h2 className="text-[20px] font-bold mb-2">Features</h2>
          <p className="text-[15px] leading-relaxed text-gray-700 whitespace-pre-line">
            {data.featureBullets}
          </p>
        </div>
      )}

      {/* What's New */}
      {data.whatsNew && (
        <div className="bg-white mt-2 px-5 py-4">
          <h2 className="text-[20px] font-bold mb-2">What&apos;s New</h2>
          <p className="text-[15px] leading-relaxed text-gray-700 whitespace-pre-line">
            {data.whatsNew}
          </p>
        </div>
      )}

      {/* Developer */}
      {data.developer && (
        <div className="bg-white mt-2 px-5 py-4 flex items-center justify-between">
          <div>
            <div className="text-[11px] text-gray-400 uppercase tracking-wide">Developer</div>
            <div className="text-[15px] text-[#007aff]">{data.developer}</div>
          </div>
          <span className="text-gray-300 text-lg">›</span>
        </div>
      )}

      {/* Bottom padding */}
      <div className="h-4" />
    </div>
  );
}
