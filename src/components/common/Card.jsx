const accentColors = {
  emerald: 'border-l-emerald-500',
  blue: 'border-l-blue-500',
  amber: 'border-l-amber-500',
  red: 'border-l-red-500',
  gray: 'border-l-gray-300',
};

export default function Card({
  children,
  accent = 'emerald',
  className = '',
  onClick,
}) {
  return (
    <div
      className={`
        bg-white rounded-xl shadow-sm border-l-4
        ${accentColors[accent]}
        ${onClick ? 'cursor-pointer active:scale-[0.98] transition-transform' : ''}
        ${className}
      `}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
