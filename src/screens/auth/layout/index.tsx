import { HStack } from "@/components/ui/hstack";
import { Image } from "@/components/ui/image";
import { SafeAreaView } from "@/components/ui/safe-area-view";
import { ScrollView } from "@/components/ui/scroll-view";
import { VStack } from "@/components/ui/vstack";

type AuthLayoutProps = {
  children: React.ReactNode;
};

export const AuthLayout = (props: AuthLayoutProps) => {
  return (
    <SafeAreaView className="h-full w-full">
      <ScrollView
        className="h-full w-full"
        contentContainerStyle={{ flexGrow: 1 }}
      >
        <HStack className="h-full w-full flex-grow justify-center bg-background-0">
          <VStack
            className="relative hidden h-full w-full flex-1 items-center justify-center md:flex"
            space="md"
          >
            <Image
              height="100%"
              width="100%"
              source={require("@assets/auth/radialGradient.png")}
              className="h-full w-full object-cover"
              alt="Radial Gradient"
            />
          </VStack>
          <VStack className="h-full w-full flex-1 gap-16 p-9 md:m-auto md:w-1/2 md:items-center md:justify-center md:gap-10">
            {props.children}
          </VStack>
        </HStack>
      </ScrollView>
    </SafeAreaView>
  );
};
