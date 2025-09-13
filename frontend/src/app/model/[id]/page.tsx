import type { Metadata } from "next";

type PageProps = {
  params: { id: string };
};

export const metadata: Metadata = {
  title: "Model",
};

export default function ModelPage({ params }: PageProps) {
  return (
    <div className="min-h-screen w-full flex items-center justify-center p-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">Model {params.id}</h1>
        <p className="text-neutral-600">This is a placeholder page for model {params.id}.</p>
      </div>
    </div>
  );
}


