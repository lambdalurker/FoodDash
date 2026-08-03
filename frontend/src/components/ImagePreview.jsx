export default function ImagePreview({ src, alt = 'Preview' }) {
  if (!src) return null;
  return (
    <div className="image-preview">
      <img src={src} alt={alt} />
    </div>
  );
}
