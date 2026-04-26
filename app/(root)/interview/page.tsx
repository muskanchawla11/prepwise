import InterviewGenerateForm from "@/components/InterviewGenerateForm";
import { getCurrentUser } from "@/lib/actions/auth.action";

const Page = async () => {
  const user = await getCurrentUser();

  return (
    <>
      <h3>Generate a New Interview</h3>
      <p className="text-light-100">
        Fill in the details below and Gemini will generate a tailored set of
        interview questions for you.
      </p>

      <InterviewGenerateForm userId={user?.id ?? ""} />
    </>
  );
};

export default Page;
