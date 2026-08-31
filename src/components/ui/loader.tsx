export default function ClassicLoader({ size = 40 }: { size?: number }) {
  return (
    <div
      className="animate-spin rounded-full border-4"
      style={{ 
        width: size, 
        height: size,
        borderColor: '#ffffff',
        borderTopColor: '#5A2633'
      }}
    />
  );
}
