export default function BottomSheet({ onClose, children, innerClassName }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(33,23,56,0.3)]"
      onClick={onClose}
    >
      <div
        className={`w-full bg-white/95 backdrop-blur-md rounded-t-[20px] p-6 flex flex-col gap-4 max-h-[85dvh] ${innerClassName ?? 'overflow-y-auto'}`}
        onClick={e => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  )
}
