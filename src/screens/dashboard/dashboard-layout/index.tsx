import {
  Avatar,
  AvatarFallbackText,
  AvatarImage,
} from "@/components/ui/avatar";
import { Box } from "@/components/ui/box";
import { Button, ButtonText } from "@/components/ui/button";
import { Divider } from "@/components/ui/divider";
import { Grid, GridItem } from "@/components/ui/grid";
import { Heading } from "@/components/ui/heading";
import { HStack } from "@/components/ui/hstack";
import { ChevronLeftIcon, Icon, MenuIcon } from "@/components/ui/icon";
import { Pressable } from "@/components/ui/pressable";
import { SafeAreaView } from "@/components/ui/safe-area-view";
import { ScrollView } from "@/components/ui/scroll-view";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { cn } from "@gluestack-ui/nativewind-utils/cn";
import { isWeb } from "@gluestack-ui/nativewind-utils/IsWeb";
import useRouter from "@unitools/router";
import type { LucideIcon } from "lucide-react-native";
import { useState } from "react";
import { Platform } from "react-native";
import { CalendarIcon } from "./assets/icons/calendar";
import { GlobeIcon } from "./assets/icons/globe";
import { HeartIcon } from "./assets/icons/heart";
import { HomeIcon } from "./assets/icons/home";
import { InboxIcon } from "./assets/icons/inbox";
import { ProfileIcon } from "./assets/icons/profile";
type MobileHeaderProps = {
  title: string;
};

type HeaderProps = {
  title: string;
  toggleSidebar: () => void;
};

type Icons = {
  iconName: LucideIcon | typeof Icon;
};
const list: Icons[] = [
  {
    iconName: HomeIcon,
  },
  {
    iconName: InboxIcon,
  },
  {
    iconName: GlobeIcon,
  },
  {
    iconName: HeartIcon,
  },
];
type BottomTabs = {
  iconName: LucideIcon | typeof Icon;
  iconText: string;
};
const bottomTabsList: BottomTabs[] = [
  {
    iconName: HomeIcon,
    iconText: "Home",
  },

  {
    iconName: GlobeIcon,
    iconText: "Community",
  },
  {
    iconName: InboxIcon,
    iconText: "Inbox",
  },
  {
    iconName: HeartIcon,
    iconText: "Favourite",
  },
  {
    iconName: ProfileIcon,
    iconText: "Profile",
  },
];

interface CardData {
  bannerUri: string;
  title: string;
  description: string;
}
interface HolidaysCardData {
  icon: any;
  title: string;
  description: string;
}
interface LeavesCardData {
  title: string;
  description: string;
  leaves: number;
  isDisabled: boolean;
}
interface ColleaguesCardData {
  image: any;
  title: string;
  position: string;
}

const HeadingCards: CardData[] = [
  {
    bannerUri: require("@assets/dashboard/dashboard-layout/image.png"),
    title: "Update your profile",
    description: "Add your details",
  },
  {
    bannerUri: require("@assets/dashboard/dashboard-layout/image2.png"),
    title: "Your skills",
    description: "Add your skills here",
  },
  {
    bannerUri: require("@assets/dashboard/dashboard-layout/image3.png"),
    title: "Your goals",
    description: "Set a target to accomplish",
  },
  {
    bannerUri: require("@assets/dashboard/dashboard-layout/image3.png"),
    title: "Your goals",
    description: "Set a target to accomplish",
  },
  {
    bannerUri: require("@assets/dashboard/dashboard-layout/image3.png"),
    title: "Your goals",
    description: "Set a target to accomplish",
  },
];
const HolidaysCards: HolidaysCardData[] = [
  {
    icon: CalendarIcon,
    title: "Navaratri",
    description: "12 March, Monday (Optional holiday)",
  },
  {
    icon: CalendarIcon,
    title: "Durga Puja",
    description: "12 October, Tuesday",
  },
  {
    icon: CalendarIcon,
    title: "Diwali",
    description: "12 March, Wednesday",
  },
  {
    icon: CalendarIcon,
    title: "Christmas",
    description: "12 March, Thursday",
  },
];
const LeavesCards: LeavesCardData[] = [
  {
    title: "Earned Leaves",
    description: "Available 24",
    leaves: 24,
    isDisabled: false,
  },
  {
    title: "Sick Leaves",
    description: "Available 24",
    leaves: 24,
    isDisabled: false,
  },
  {
    title: "Menstrual Leaves",
    description: "Available 20",
    leaves: 20,
    isDisabled: false,
  },
  {
    title: "Optional Leaves",
    description: "Available 0",
    leaves: 0,
    isDisabled: true,
  },
];
const ColleaguesCards: ColleaguesCardData[] = [
  {
    image: require("@assets/dashboard/dashboard-layout/image7.png"),
    title: "Emily Zho",
    position: "UI/UX Designer",
  },
  {
    image: require("@assets/dashboard/dashboard-layout/image4.png"),
    title: "Marilyn Monroe",
    position: "SDE II",
  },
  {
    image: require("@assets/dashboard/dashboard-layout/image5.png"),
    title: "James Kant",
    position: "SDE III",
  },
  {
    image: require("@assets/dashboard/dashboard-layout/image6.png"),
    title: "Richard Faynmen",
    position: "CEO Marketing",
  },
];

const Sidebar = () => {
  const router = useRouter();
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const handlePress = (index: number) => {
    setSelectedIndex(index);
    router.push("/dashboard/dashboard-layout");
  };

  return (
    <VStack
      className="border-border-300 h-full w-14 items-center border-r pt-5"
      space="xl"
    >
      {list.map((item, index) => {
        return (
          <Pressable
            key={index}
            className="hover:bg-background-50"
            onPress={() => handlePress(index)}
          >
            <Icon
              as={item.iconName}
              className={`h-9 w-[55px] stroke-background-800 ${index === selectedIndex ? "fill-background-800" : "fill-none"} `}
            />
          </Pressable>
        );
      })}
    </VStack>
  );
};

const DashboardLayout = (props: any) => {
  const [isSidebarVisible, setIsSidebarVisible] = useState(
    props.isSidebarVisible,
  );
  function toggleSidebar() {
    setIsSidebarVisible(!isSidebarVisible);
  }
  return (
    <VStack className="h-full w-full bg-background-0">
      <Box className="md:hidden">
        <MobileHeader title={props.title} />
      </Box>
      <Box className="hidden md:flex">
        <WebHeader toggleSidebar={toggleSidebar} title={props.title} />
      </Box>
      <VStack className="h-full w-full">
        <HStack className="h-full w-full">
          <Box className="hidden h-full md:flex">
            {isSidebarVisible && <Sidebar />}
          </Box>
          <VStack className="w-full">{props.children}</VStack>
        </HStack>
      </VStack>
    </VStack>
  );
};

function MobileFooter({ footerIcons }: { footerIcons: any }) {
  const router = useRouter();
  return (
    <HStack
      className={cn(
        "border-t-border-300 absolute bottom-0 left-0 right-0 w-full items-center justify-between overflow-hidden border-t bg-background-0 p-3 md:hidden",
        { "pb-5": Platform.OS === "ios" },
        { "pb-5": Platform.OS === "android" },
      )}
    >
      {footerIcons.map(
        (
          item: { iconText: string; iconName: any },
          index: React.Key | null | undefined,
        ) => {
          return (
            <Pressable
              className="flex-1 flex-col items-center px-0.5"
              key={index}
              onPress={() => router.push("/dashboard/dashboard-layout")}
            >
              <Icon
                as={item.iconName}
                size="md"
                className="h-[32px] w-[65px]"
              />
              <Text className="text-center text-xs text-typography-600">
                {item.iconText}
              </Text>
            </Pressable>
          );
        },
      )}
    </HStack>
  );
}

function WebHeader(props: HeaderProps) {
  return (
    <HStack className="border-border-300 items-center justify-between border-b bg-background-0 pb-3 pr-10 pt-4">
      <HStack className="items-center">
        <Pressable
          onPress={() => {
            props.toggleSidebar();
          }}
        >
          <Icon as={MenuIcon} size="lg" className="mx-5" />
        </Pressable>
        <Text className="text-2xl">{props.title}</Text>
      </HStack>

      <Avatar className="h-9 w-9">
        <AvatarFallbackText className="font-light">A</AvatarFallbackText>
      </Avatar>
    </HStack>
  );
}

function MobileHeader(props: MobileHeaderProps) {
  const router = useRouter();
  return (
    <HStack
      className="border-border-50 items-center border-b bg-background-0 px-4 py-6"
      space="md"
    >
      <Pressable
        onPress={() => {
          router.back();
        }}
      >
        <Icon as={ChevronLeftIcon} />
      </Pressable>
      <Text className="text-xl">{props.title}</Text>
    </HStack>
  );
}

const MainContent = () => {
  return (
    <Box className="flex-1">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: isWeb ? 0 : 100,
          flexGrow: 1,
        }}
        className="mb-20 flex-1 md:mb-2"
      >
        <VStack className="w-full p-4 pb-0 md:px-10 md:pt-6" space="2xl">
          <Heading size="2xl" className="font-roboto">
            Welcome Alexander
          </Heading>

          <Grid className="gap-5">
            {HeadingCards.map((item, index) => {
              return (
                <GridItem
                  _extra={{
                    className: "col-span-12 sm:col-span-6 lg:col-span-4",
                  }}
                  key={index}
                >
                  <HStack
                    space="md"
                    className="border-border-300 items-center justify-between rounded-lg border p-4"
                  >
                    <HStack space="xl" className="items-center">
                      <Avatar>
                        <AvatarImage
                          height={"100%"}
                          width={"100%"}
                          source={item.bannerUri}
                        />
                      </Avatar>
                      <VStack>
                        <Text className="line-clamp-1 font-semibold text-typography-900">
                          {item.title}
                        </Text>
                        <Text className="line-clamp-1">{item.description}</Text>
                      </VStack>
                    </HStack>
                    <Button size="xs">
                      <ButtonText>Edit</ButtonText>
                    </Button>
                  </HStack>
                </GridItem>
              );
            })}
          </Grid>

          <Box className="rounded-md bg-background-50 p-4">
            <Text className="text-center font-medium">
              To view analytics you need client ID. Add it to your settings and
              you’re good to go.
            </Text>
          </Box>
          <Grid className="gap-5">
            <GridItem
              _extra={{
                className: "col-span-12 sm:col-span-6 lg:col-span-4",
              }}
            >
              <VStack
                className="border-border-300 items-center justify-between rounded-lg border px-4 py-6"
                space="sm"
              >
                <Box className="w-full self-start px-4">
                  <Heading
                    size="lg"
                    className="font-roboto text-typography-700"
                  >
                    Upcoming Holidays
                  </Heading>
                </Box>
                <Divider />
                {HolidaysCards.map((item, index) => {
                  return (
                    <HStack space="lg" key={index} className="w-full px-4 py-2">
                      <Avatar className="h-10 w-10 bg-background-50">
                        <Icon as={item.icon} />
                      </Avatar>
                      <VStack>
                        <Text className="line-clamp-1 font-roboto text-typography-900">
                          {item.title}
                        </Text>
                        <Text className="line-clamp-1 font-roboto text-sm">
                          {item.description}
                        </Text>
                      </VStack>
                    </HStack>
                  );
                })}
              </VStack>
            </GridItem>
            <GridItem
              _extra={{
                className: "col-span-12 sm:col-span-6 lg:col-span-4",
              }}
            >
              <VStack
                className="border-border-300 items-center justify-between rounded-lg border px-4 py-6"
                space="sm"
              >
                <Box className="w-full self-start px-4">
                  <Heading
                    size="lg"
                    className="font-roboto text-typography-700"
                  >
                    Your Leaves
                  </Heading>
                </Box>
                <Divider />
                {LeavesCards.map((item, index) => {
                  return (
                    <HStack
                      space="lg"
                      key={index}
                      className="w-full items-center justify-between px-4 py-2"
                    >
                      <HStack space="xl" className="items-center">
                        <Box
                          className={cn(
                            "h-10 w-10 items-center justify-center rounded-full",
                            { "bg-success-0": item.leaves !== 0 },
                            { "bg-error-50": item.leaves === 0 },
                          )}
                        >
                          <Text
                            className={cn(
                              { "text-success-800": item.leaves !== 0 },
                              { "text-error-700": item.leaves === 0 },
                            )}
                          >
                            {item.leaves}
                          </Text>
                        </Box>
                        <VStack>
                          <Text className="line-clamp-1 font-roboto text-typography-900">
                            {item.title}
                          </Text>
                          <Text className="line-clamp-1 font-roboto text-sm">
                            {item.description}
                          </Text>
                        </VStack>
                      </HStack>
                      <Button
                        isDisabled={item.isDisabled}
                        variant="outline"
                        action="secondary"
                        size="xs"
                      >
                        <ButtonText>Apply</ButtonText>
                      </Button>
                    </HStack>
                  );
                })}
              </VStack>
            </GridItem>
            <GridItem
              _extra={{
                className: "col-span-12 sm:col-span-6 lg:col-span-4",
              }}
            >
              <VStack
                className="border-border-300 items-center justify-between rounded-lg border px-4 py-6"
                space="sm"
              >
                <Box className="w-full self-start px-4">
                  <Heading
                    size="lg"
                    className="font-roboto text-typography-700"
                  >
                    New colleagues
                  </Heading>
                </Box>
                <Divider />
                {ColleaguesCards.map((item, index) => {
                  return (
                    <HStack space="lg" key={index} className="w-full px-4 py-2">
                      <Avatar className="h-10 w-10">
                        <AvatarImage
                          height={"100%"}
                          width={"100%"}
                          source={item.image}
                        />
                      </Avatar>
                      <VStack>
                        <Text className="line-clamp-1 font-roboto text-typography-900">
                          {item.title}
                        </Text>
                        <Text className="line-clamp-1 font-roboto text-sm">
                          {item.position}
                        </Text>
                      </VStack>
                    </HStack>
                  );
                })}
              </VStack>
            </GridItem>
            <GridItem
              _extra={{
                className: "col-span-12 sm:col-span-6 lg:col-span-4",
              }}
            >
              <VStack
                className="border-border-300 items-center justify-between rounded-lg border px-4 py-6"
                space="sm"
              >
                <Box className="w-full self-start px-4">
                  <Heading
                    size="lg"
                    className="font-roboto text-typography-700"
                  >
                    New colleagues
                  </Heading>
                </Box>
                <Divider />
                {ColleaguesCards.map((item, index) => {
                  return (
                    <HStack space="lg" key={index} className="w-full px-4 py-2">
                      <Avatar className="h-10 w-10">
                        <AvatarImage
                          height={"100%"}
                          width={"100%"}
                          source={item.image}
                        />
                      </Avatar>
                      <VStack>
                        <Text className="line-clamp-1 font-roboto text-typography-900">
                          {item.title}
                        </Text>
                        <Text className="line-clamp-1 font-roboto text-sm">
                          {item.position}
                        </Text>
                      </VStack>
                    </HStack>
                  );
                })}
              </VStack>
            </GridItem>
          </Grid>
        </VStack>
      </ScrollView>
    </Box>
  );
};

export const Dashboard = () => {
  return (
    <SafeAreaView className="h-full w-full">
      <DashboardLayout title="Dashboard" isSidebarVisible={true}>
        <MainContent />
      </DashboardLayout>
      <MobileFooter footerIcons={bottomTabsList} />
    </SafeAreaView>
  );
};
