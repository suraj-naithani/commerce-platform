export default function CartItem({ item, onDecrement, onIncrement, onRemove }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-[#deead8] bg-white p-4 shadow-sm">
      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-[#f4f8ef]">
          <img src={item.image} alt={item.name} className="h-10 w-10 object-contain" />
        </div>
        <div>
          <p className="text-sm font-semibold text-[#2f453b]">{item.name}</p>
          <p className="text-sm text-[#6f867a]">${Number(item.price || 0).toFixed(2)}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => onDecrement(item.id)}
          className="cursor-pointer rounded-lg border border-[#cadac1] px-3 py-1 text-sm text-[#4b6358]"
        >
          -
        </button>
        <span className="w-8 text-center text-sm text-[#365145]">{item.quantity}</span>
        <button
          onClick={() => onIncrement(item.id)}
          className="cursor-pointer rounded-lg border border-[#cadac1] px-3 py-1 text-sm text-[#4b6358]"
        >
          +
        </button>
        <button onClick={() => onRemove(item.id)} className="ml-3 cursor-pointer text-sm text-[#ca8266]">
          Remove
        </button>
      </div>
    </div>
  );
}
