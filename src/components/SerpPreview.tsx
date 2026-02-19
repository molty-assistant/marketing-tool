'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export interface SerpPreviewProps {
  title: string;
  url: string;
  description: string;
  editable?: boolean;
  onTitleChange?: (value: string) => void;
  onUrlChange?: (value: string) => void;
  onDescriptionChange?: (value: string) => void;
}

export function SerpPreview({
  title,
  url,
  description,
  editable = false,
  onTitleChange,
  onUrlChange,
  onDescriptionChange,
}: SerpPreviewProps) {
  const [localTitle, setLocalTitle] = useState(title);
  const [localUrl, setLocalUrl] = useState(url);
  const [localDescription, setLocalDescription] = useState(description);

  useEffect(() => {
    setLocalTitle(title);
  }, [title]);

  useEffect(() => {
    setLocalUrl(url);
  }, [url]);

  useEffect(() => {
    setLocalDescription(description);
  }, [description]);

  const handleTitleChange = (value: string) => {
    setLocalTitle(value);
    onTitleChange?.(value);
  };

  const handleUrlChange = (value: string) => {
    setLocalUrl(value);
    onUrlChange?.(value);
  };

  const handleDescriptionChange = (value: string) => {
    setLocalDescription(value);
    onDescriptionChange?.(value);
  };

  const titleLength = localTitle.length;
  const descriptionLength = localDescription.length;
  const titleTruncated = localTitle.slice(0, 60);
  const descriptionTruncated = localDescription.slice(0, 160);

  // Extract domain from URL for breadcrumb
  const getDomain = (urlString: string): string => {
    try {
      const urlObj = new URL(urlString.startsWith('http') ? urlString : `https://${urlString}`);
      return urlObj.hostname.replace('www.', '');
    } catch {
      return urlString;
    }
  };

  const domain = getDomain(localUrl);

  return (
    <div className="space-y-6">
      {/* Editable fields */}
      {editable && (
        <div className="space-y-4 bg-slate-800/50 border border-slate-700 rounded-xl p-5">
          <div>
            <Label className="block mb-2">
              Title
              <span
                className={`ml-2 text-xs ${
                  titleLength > 60 ? 'text-red-400' : 'text-slate-500'
                }`}
              >
                {titleLength} / 60 chars
                {titleLength > 60 && ' ⚠️ Too long'}
              </span>
            </Label>
            <Input
              type="text"
              value={localTitle}
              onChange={(e) => handleTitleChange(e.target.value)}
              className="bg-slate-900 border-slate-600 rounded-lg px-4"
              placeholder="Enter page title..."
            />
          </div>

          <div>
            <Label className="block mb-2">
              URL
            </Label>
            <Input
              type="text"
              value={localUrl}
              onChange={(e) => handleUrlChange(e.target.value)}
              className="bg-slate-900 border-slate-600 rounded-lg px-4"
              placeholder="https://example.com"
            />
          </div>

          <div>
            <Label className="block mb-2">
              Description
              <span
                className={`ml-2 text-xs ${
                  descriptionLength > 160 ? 'text-red-400' : 'text-slate-500'
                }`}
              >
                {descriptionLength} / 160 chars
                {descriptionLength > 160 && ' ⚠️ Too long'}
              </span>
            </Label>
            <Textarea
              value={localDescription}
              onChange={(e) => handleDescriptionChange(e.target.value)}
              rows={3}
              className="bg-slate-900 border-slate-600 rounded-lg px-4 resize-none"
              placeholder="Enter meta description..."
            />
          </div>

          {/* Character warnings */}
          {(titleLength > 60 || descriptionLength > 160) && (
            <div className="bg-red-950/30 border border-red-800/50 rounded-lg p-3">
              <p className="text-sm text-red-400">
                ⚠️ <strong>SEO Warning:</strong> Google typically truncates titles over 60
                characters and descriptions over 160 characters in search results.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Google SERP Preview */}
      <div className="bg-white rounded-xl p-6 shadow-lg">
        <div className="flex items-start gap-3">
          {/* Favicon placeholder */}
          <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0 mt-0.5">
            <div className="w-4 h-4 rounded-full bg-slate-400" />
          </div>

          <div className="flex-1 min-w-0">
            {/* URL breadcrumb */}
            <div className="flex items-center gap-1 text-sm mb-0.5">
              <span className="text-slate-700">{domain}</span>
              <svg
                className="w-3 h-3 text-slate-400"
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
            </div>

            {/* Title link */}
            <h3 className="text-xl text-blue-700 hover:underline cursor-pointer leading-snug mb-1 break-words font-normal">
              {titleLength > 60 ? `${titleTruncated}...` : localTitle}
            </h3>

            {/* Description */}
            <p className="text-sm text-slate-700 leading-relaxed break-words">
              {descriptionLength > 160
                ? `${descriptionTruncated}...`
                : localDescription}
            </p>
          </div>
        </div>
      </div>

      {/* Character count summary */}
      {!editable && (
        <div className="flex gap-4 text-sm">
          <div>
            <span className="text-slate-400">Title: </span>
            <span
              className={titleLength > 60 ? 'text-red-400 font-medium' : 'text-slate-300'}
            >
              {titleLength} / 60
            </span>
          </div>
          <div>
            <span className="text-slate-400">Description: </span>
            <span
              className={
                descriptionLength > 160 ? 'text-red-400 font-medium' : 'text-slate-300'
              }
            >
              {descriptionLength} / 160
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
