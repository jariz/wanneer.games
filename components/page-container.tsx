import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function Container({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("mx-auto w-full max-w-[1680px] px-[18px] phone:px-6 desktop:px-11 wide:px-[55px]", className)} {...props} />;
}

export default function PageContainer({ className, ...props }: ComponentProps<"div">) {
  return <Container className={cn("pb-[30px] pt-6 phone:py-8 desktop:pb-12 desktop:pt-[39px] wide:pb-[55px] wide:pt-[43px]", className)} {...props} />;
}
