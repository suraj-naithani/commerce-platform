import Image from "next/image";

export default function CartItem({ item }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-[#deead8] bg-white p-4 shadow-sm">
      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-[#f4f8ef]">
          <Image src={item.image} alt={item.name} width={30} height={30} />
        </div>
        <div>
          <p className="text-sm font-semibold text-[#2f453b]">{item.name}</p>
          <p className="text-sm text-[#6f867a]">${item.price}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button className="rounded-lg border border-[#cadac1] px-3 py-1 text-sm text-[#4b6358]">-</button>
        <span className="w-8 text-center text-sm text-[#365145]">{item.quantity}</span>
        <button className="rounded-lg border border-[#cadac1] px-3 py-1 text-sm text-[#4b6358]">+</button>
        <button className="ml-3 text-sm text-[#ca8266]">Remove</button>
      </div>
    </div>
  );
}
