interface AvatarProps {
  name: string
  src?: string
  size?: number
}

export default function Avatar({ name, src, size = 40 }: AvatarProps) {
  const initials = name?.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() || '?'
  const colors = ['bg-blue-100 text-blue-700', 'bg-green-100 text-green-700', 'bg-purple-100 text-purple-700', 'bg-amber-100 text-amber-700', 'bg-rose-100 text-rose-700']
  const color = colors[name?.charCodeAt(0) % colors.length] || colors[0]
  if (src) return <img src={src} alt={name} className="rounded-full object-cover" style={{ width: size, height: size }} />
  return (
    <div className={`rounded-full flex items-center justify-center font-semibold shrink-0 ${color}`} style={{ width: size, height: size, fontSize: size * 0.36 }}>
      {initials}
    </div>
  )
}
