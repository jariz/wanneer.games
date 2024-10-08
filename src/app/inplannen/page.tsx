"use client";
import Cal from "@calcom/embed-react";
import { getCalApi } from "@calcom/embed-react";
import { useRouter } from "next/navigation";
import { invalidate } from "../actions";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, RefreshCcw } from "lucide-react";

const Inplannen = () => {
  const { push } = useRouter();
  const { toast } = useToast();
  useEffect(() => {
    const bindEvents = async () => {
      const cal = await getCalApi();
      cal("on", {
        action: "bookingSuccessful",
        callback: async () => {
          toast({
            title: (
              <>
                <RefreshCcw className="inline mr-2" /> Invalidating cache...
              </>
            ) as unknown as string,
          });
          await invalidate();
          push("/");
          toast({
            title: (
              <>
                <CheckCircle className="inline" /> Ingepland!
              </>
            ) as unknown as string,
            description: "Game sessie toegevoegd",
          });
        },
      });
    };
    bindEvents();
  }, [push, toast]);

  return (
    <div className="w-full">
      <Cal
        calLink="jari-eilpsm/3w2narypfrcjmzja"
        config={{
          theme: "dark",
          name: "Gamer",
          email: "jarizw+cal@gmail.com",
        }}
      ></Cal>
    </div>
  );
};
export default Inplannen;
