import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { Users, Download, UserCheck } from "lucide-react";
import { auth } from "@/domains/auth/lib/auth";
import { db } from "@/shared/db";
import { users } from "@/shared/db/schema";
import { getOrCreateInvitation, getInvitedUsers } from "@/domains/invitations";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";

export default async function InvitePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
  });
  if (!user) redirect("/login");

  const [invitation, invitedUsers] = await Promise.all([
    getOrCreateInvitation(session.user.id),
    getInvitedUsers(session.user.id),
  ]);

  let invitedByName: string | null = null;
  if (user.invitedById) {
    const inviter = await db.query.users.findFirst({
      where: eq(users.id, user.invitedById),
    });
    invitedByName = inviter?.name ?? null;
  }

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4">
      <h1 className="text-xl font-bold">Zaproś znajomych</h1>

      {invitedByName && (
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm flex items-center gap-2 text-muted-foreground">
              <UserCheck className="h-4 w-4 shrink-0" />
              Zostałeś zaproszony przez{" "}
              <span className="font-medium text-foreground">{invitedByName}</span>
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            Osoby, które dołączyły przez Twoje zaproszenie
            {invitedUsers.length > 0 && (
              <span className="ml-auto text-sm font-normal text-muted-foreground">
                {invitedUsers.length}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {invitedUsers.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Jeszcze nikt nie dołączył przez Twoje zaproszenie.
            </p>
          ) : (
            <ul className="space-y-2">
              {invitedUsers.map((u, i) => (
                <li key={i} className="flex items-center justify-between text-sm">
                  <span className="font-medium">{u.name}</span>
                  <span className="text-muted-foreground text-xs">
                    {u.createdAt.toLocaleDateString("pl-PL")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4">
          <p className="text-sm text-muted-foreground mb-4">
            Wygeneruj plakat z kodem QR i podziel się nim ze znajomymi.
            Możesz go wydrukować lub wysłać jako plik.
          </p>
          <a href="/api/invite/poster" download="zaproszenie.pdf">
            <Button className="w-full gap-2">
              <Download className="h-4 w-4" />
              Wygeneruj zaproszenie
            </Button>
          </a>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground text-center">
        Twój kod: <span className="font-mono">{invitation.code}</span>
      </p>
    </div>
  );
}
