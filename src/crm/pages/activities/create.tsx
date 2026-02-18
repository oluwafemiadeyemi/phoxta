import { CreateView, CreateViewHeader } from "@crm/components/refine-ui/views/create-view";
import { ActivityForm } from "./form";
import { useSearchParams } from "react-router";
import dayjs from "dayjs";

export default function ActivitiesCreate() {
  const [searchParams] = useSearchParams();
  const title = searchParams.get("title") ?? "";
  const forToday = searchParams.get("for") === "today";

  return (
    <CreateView>
      <CreateViewHeader title="Create Activity" />
      <ActivityForm
        action="create"
        initialValues={{
          title,
          date: forToday ? dayjs().format("YYYY-MM-DD") : undefined,
          time: forToday ? dayjs().format("HH:mm") : undefined,
        }}
      />
    </CreateView>
  );
}
