export default function TestimonialsSection({ testimonials }) {
  return (
    <section className="mt-14">
      <h2 className="text-2xl font-semibold text-[#2f453b]">What shoppers say</h2>
      <div className="mt-6 grid gap-5 md:grid-cols-3">
        {testimonials.map((item) => (
          <article key={item.id} className="rounded-2xl border border-[#dfebd8] bg-white p-5 shadow-sm">
            <p className="text-sm leading-6 text-[#5e766a]">{item.quote}</p>
            <p className="mt-3 text-sm font-semibold text-[#2f453b]">{item.name}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
