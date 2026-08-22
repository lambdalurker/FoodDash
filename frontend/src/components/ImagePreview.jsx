import { getImageUrl } from '../api/client';

export default function ImagePreview({ src, alt = 'Preview' }) {
  if (!src) return null;
  return (
    <div className="image-preview">
      <img src={getImageUrl(src)} alt={alt} />
    </div>
  );
}
