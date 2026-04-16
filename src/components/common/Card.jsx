const accentColors = {
  blue: 'border-l-indigo-500',
  green: 'border-l-green-500',
  amber: 'border-l-amber-500',
  red: 'border-l-red-500',
  gray: 'border-l-gray-200',
};

export default function Card({
  children,
  accent = 'blue',
  className = '',
  onClick,
}) {
  return (
    <div
      className={`
        bg-white rounded-2xl shadow-sm border border-gray-100 border-l-4
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
