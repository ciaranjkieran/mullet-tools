export default function ContactPage() {
    return (
      <section className="max-w-3xl mx-auto p-8">
        <h1 className="text-3xl font-bold mb-4">Contact</h1>
        <p className="text-gray-700 mb-4">
          Got feedback or ideas? Drop me a line.
        </p>
        <a 
          href="mailto:hello@mullet.tools" 
          className="text-blue-600 underline"
        >
          hello@mullet.tools
        </a>
      </section>
    );
  }
  