"use client";

import { useActionState } from "react";
import { signIn, type SignInState } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";

const initialState: SignInState = {};

export default function AdminLoginPage() {
  const [state, formAction, isPending] = useActionState(signIn, initialState);

  return (
    <main id="main-content" className="flex flex-1 items-center justify-center bg-muted px-4 py-16">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Admin sign in</CardTitle>
          <CardDescription>Operations dashboard access only.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="flex flex-col gap-4">
            {state.error ? <Alert variant="danger">{state.error}</Alert> : null}
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" autoComplete="username" required />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                name="remember"
                defaultChecked
                className="accent-accent"
              />
              Remember me on this device
            </label>
            <Button type="submit" disabled={isPending} className="mt-2 w-full">
              {isPending ? "Signing in..." : "Sign in"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
