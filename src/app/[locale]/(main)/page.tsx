import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Sprout, ArrowRight } from "lucide-react";
import { auth } from "@/domains/auth/lib/auth";
import { getListings } from "@/domains/marketplace/queries/get-listings";
import { getEvents } from "@/domains/social/queries/get-events";
import { getGroups } from "@/domains/social/queries/get-groups";
import { getFeed } from "@/domains/social/queries/get-feed";
import { ListingCard } from "@/domains/marketplace/components/listing-card";
import { EventCard } from "@/domains/social/components/event-card";
import { GroupCard } from "@/domains/social/components/group-card";
import { PostCard } from "@/domains/social/components/post-card";
import { Button } from "@/shared/ui/button";

export default async function HomePage() {
  const session = await auth();

  if (!session?.user?.id) {
    return <GuestHome />;
  }

  return <AuthenticatedHome userId={session.user.id} />;
}

async function GuestHome() {
  const t = await getTranslations("home");
  const tc = await getTranslations("common");

  const { results: listings } = await getListings({
    sort: "newest",
    page: 1,
  });

  return (
    <div className="space-y-12 py-8">
      {/* Hero */}
      <section className="max-w-3xl mx-auto text-center px-4 space-y-4">
        <Sprout className="h-12 w-12 mx-auto text-primary" />
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
          {t("hero")}
        </h1>
        <p className="text-lg text-muted-foreground max-w-xl mx-auto">
          {t("heroDescription")}
        </p>
        <div className="flex gap-3 justify-center pt-2">
          <Button asChild size="lg">
            <Link href="/register">{t("ctaRegister")}</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/login">{t("ctaLogin")}</Link>
          </Button>
        </div>
      </section>

      {/* Latest listings */}
      {listings.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 space-y-4">
          <SectionHeader
            title={t("latestListings")}
            href="/marketplace"
            more={tc("showMore")}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {listings.slice(0, 3).map((item) => (
              <ListingCard key={item.listing.id} item={item} hideImage />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

async function AuthenticatedHome({ userId }: { userId: string }) {
  const t = await getTranslations("home");
  const tc = await getTranslations("common");

  const [{ results: listings }, events, groups, feed] = await Promise.all([
    getListings({ sort: "newest", page: 1 }),
    getEvents({ upcoming: true }),
    getGroups(userId),
    getFeed(userId, 1),
  ]);

  const myGroups = groups.filter((g) => g.isMember);

  return (
    <div className="space-y-10 py-6">
      {/* Feed / Aktualności */}
      {feed.length > 0 && (
        <section className="max-w-2xl mx-auto px-4 space-y-4">
          <SectionHeader
            title={t("yourFeed")}
            href="/social"
            more={tc("showMore")}
          />
          <div className="space-y-4">
            {feed.slice(0, 3).map((post) => (
              <PostCard
                key={post.id}
                post={post}
                currentUserId={userId}
              />
            ))}
          </div>
        </section>
      )}

      {/* Latest listings / Najnowsze produkty */}
      <section className="max-w-7xl mx-auto px-4 space-y-4">
        <SectionHeader
          title={t("latestListings")}
          href="/marketplace"
          more={tc("showMore")}
        />
        {listings.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("noListings")}</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {listings.slice(0, 3).map((item) => (
              <ListingCard key={item.listing.id} item={item} hideImage />
            ))}
          </div>
        )}
      </section>

      {/* Upcoming events */}
      <section className="max-w-7xl mx-auto px-4 space-y-4">
        <SectionHeader
          title={t("upcomingEvents")}
          href="/social/events"
          more={tc("showMore")}
        />
        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("noEvents")}</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {events.slice(0, 3).map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </section>

      {/* My groups */}
      {myGroups.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 space-y-4">
          <SectionHeader
            title={t("yourGroups")}
            href="/social/groups"
            more={tc("showMore")}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {myGroups.slice(0, 3).map((group) => (
              <GroupCard key={group.id} group={group} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function SectionHeader({
  title,
  href,
  more,
}: {
  title: string;
  href: string;
  more: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="text-xl font-bold">{title}</h2>
      <Button asChild variant="ghost" size="sm">
        <Link href={href}>
          {more}
          <ArrowRight className="h-4 w-4 ml-1" />
        </Link>
      </Button>
    </div>
  );
}
