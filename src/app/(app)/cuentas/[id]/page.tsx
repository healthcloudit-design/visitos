import { FichaClient } from "./ficha-client";

export default function FichaPage({ params }: { params: { id: string } }) {
  return <FichaClient id={params.id} />;
}
