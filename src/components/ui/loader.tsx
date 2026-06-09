export default function ClassicLoader({ size = 40 }: { size?: number }) {
  return (
    <div
      className="animate-spin rounded-full border-4 border-gold-400 border-t-transparent"
      style={{ width: size, height: size }}
    />
  );
}
