import { useParams } from "react-router";
import ContentForm from "./form";

export default function ContentEditPage() {
  const { id } = useParams<{ id: string }>();
  return <ContentForm mode="edit" id={id} />;
}
