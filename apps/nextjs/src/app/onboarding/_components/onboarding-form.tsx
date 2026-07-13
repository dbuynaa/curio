"use client";

import { useRouter } from "next/navigation";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";

import { Button } from "@acme/ui/button";
import { Field, FieldContent, FieldError, FieldLabel } from "@acme/ui/field";
import { Input } from "@acme/ui/input";
import { Textarea } from "@acme/ui/textarea";
import { toast } from "@acme/ui/toast";

import { useTRPC } from "~/trpc/react";

const OnboardingSchema = z.object({
  username: z
    .string()
    .min(3, "At least 3 characters")
    .max(30)
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      "Letters, numbers, hyphens, and underscores only",
    ),
  displayName: z.string().max(60),
  bio: z.string().max(300),
});

export function OnboardingForm({ callbackUrl }: { callbackUrl: string }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const router = useRouter();

  const completeOnboarding = useMutation(
    trpc.user.completeOnboarding.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(trpc.user.pathFilter());
        router.push(callbackUrl);
        router.refresh();
      },
      onError: (err) => {
        toast.error(err.message);
      },
    }),
  );

  const form = useForm({
    defaultValues: {
      username: "",
      displayName: "",
      bio: "",
    },
    validators: { onSubmit: OnboardingSchema },
    onSubmit: async ({ value }) => {
      await completeOnboarding.mutateAsync({
        username: value.username,
        displayName: value.displayName || undefined,
        bio: value.bio || undefined,
      });
    },
  });

  return (
    <form
      className="space-y-8"
      onSubmit={(e) => {
        e.preventDefault();
        void form.handleSubmit();
      }}
    >
      <form.Field
        name="username"
        children={(field) => {
          const isInvalid =
            field.state.meta.isTouched && !field.state.meta.isValid;

          return (
            <UsernameField
              field={field}
              isInvalid={isInvalid}
              trpc={trpc}
            />
          );
        }}
      />

      <form.Field
        name="displayName"
        children={(field) => (
          <Field>
            <FieldContent>
              <FieldLabel htmlFor={field.name}>Display name</FieldLabel>
            </FieldContent>
            <Input
              id={field.name}
              name={field.name}
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
              placeholder="How you appear on Curio"
            />
          </Field>
        )}
      />

      <form.Field
        name="bio"
        children={(field) => (
          <Field>
            <FieldContent>
              <FieldLabel htmlFor={field.name}>Bio</FieldLabel>
            </FieldContent>
            <Textarea
              id={field.name}
              name={field.name}
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
              rows={3}
              placeholder="A sentence about what you collect"
            />
          </Field>
        )}
      />

      <Button
        type="submit"
        className="rounded-full"
        disabled={completeOnboarding.isPending}
      >
        {completeOnboarding.isPending ? "Creating profile…" : "Create profile"}
      </Button>
    </form>
  );
}

function UsernameField({
  field,
  isInvalid,
  trpc,
}: {
  field: {
    name: string;
    state: {
      value: string;
      meta: {
        errors: ({ message?: string } | undefined)[];
        isTouched: boolean;
        isValid: boolean;
      };
    };
    handleBlur: () => void;
    handleChange: (value: string) => void;
  };
  isInvalid: boolean;
  trpc: ReturnType<typeof useTRPC>;
}) {
  const username = field.state.value;
  const availability = useQuery({
    ...trpc.user.checkUsernameAvailable.queryOptions({ username }),
    enabled: username.length >= 3 && /^[a-zA-Z0-9_-]+$/.test(username),
  });

  const taken = availability.data?.available === false;

  return (
    <Field data-invalid={isInvalid || taken}>
      <FieldContent>
        <FieldLabel htmlFor={field.name}>Username</FieldLabel>
      </FieldContent>
      <Input
        id={field.name}
        name={field.name}
        value={field.state.value}
        onBlur={field.handleBlur}
        onChange={(e) => field.handleChange(e.target.value)}
        placeholder="your_handle"
        className="font-mono text-sm"
        aria-invalid={isInvalid || taken}
      />
      {availability.data?.available && (
        <p className="text-muted text-xs">Username is available</p>
      )}
      {taken && <p className="text-destructive text-xs">Username is taken</p>}
      {isInvalid && <FieldError errors={field.state.meta.errors} />}
    </Field>
  );
}
