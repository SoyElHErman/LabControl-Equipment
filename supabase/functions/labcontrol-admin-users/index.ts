import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json"
};

const allowedAccessLevels = new Set(["admin", "editor", "viewer"]);

type AdminUserPayload = {
  action?: string;
  profileId?: string;
  inviteId?: string;
  email?: string;
  name?: string;
  initials?: string;
  role?: string;
  area?: string;
  accessLevel?: string;
  isActive?: boolean;
  password?: string;
  redirectTo?: string;
};

function respond(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}

function cleanText(value: unknown) {
  return String(value || "").trim();
}

function cleanEmail(value: unknown) {
  return cleanText(value).toLowerCase();
}

function initialsFor(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 3);
}

function userRow(payload: Required<Pick<AdminUserPayload, "email" | "name" | "accessLevel">> & AdminUserPayload) {
  return {
    email: cleanEmail(payload.email),
    name: cleanText(payload.name),
    initials: (cleanText(payload.initials) || initialsFor(cleanText(payload.name))).slice(0, 3).toUpperCase(),
    job_role: cleanText(payload.role) || "Usuario de laboratorio",
    area: cleanText(payload.area) || "Laboratorio",
    access_level: payload.accessLevel,
    is_active: payload.isActive !== false
  };
}

function inviteRow(
  payload: Required<Pick<AdminUserPayload, "email" | "name" | "accessLevel">> & AdminUserPayload,
  callerId: string
) {
  const profile = userRow(payload);
  return {
    email: profile.email,
    name: profile.name,
    initials: profile.initials,
    job_role: profile.job_role,
    area: profile.area,
    access_level: profile.access_level,
    status: "pending",
    invited_by: callerId
  };
}

async function findProfileById(serviceClient: ReturnType<typeof createClient>, id: string) {
  if (!id) return null;
  const { data, error } = await serviceClient
    .from("profiles")
    .select("id,email,access_level,is_active")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function findProfileByEmail(serviceClient: ReturnType<typeof createClient>, email: string) {
  const { data, error } = await serviceClient
    .from("profiles")
    .select("id,email,access_level,is_active")
    .eq("email", email)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function findAuthUserByEmail(serviceClient: ReturnType<typeof createClient>, email: string) {
  for (let page = 1; page <= 5; page += 1) {
    const { data, error } = await serviceClient.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const found = data.users.find((user) => cleanEmail(user.email) === email);
    if (found) return found;
    if (data.users.length < 200) break;
  }
  return null;
}

async function activeAdminCount(serviceClient: ReturnType<typeof createClient>) {
  const { count, error } = await serviceClient
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("access_level", "admin")
    .eq("is_active", true);
  if (error) throw error;
  return count || 0;
}

async function upsertProfile(
  serviceClient: ReturnType<typeof createClient>,
  id: string,
  payload: Required<Pick<AdminUserPayload, "email" | "name" | "accessLevel">> & AdminUserPayload
) {
  const { error } = await serviceClient
    .from("profiles")
    .upsert({ id, ...userRow(payload) }, { onConflict: "id" });
  if (error) throw error;
}

async function markInvitesAccepted(serviceClient: ReturnType<typeof createClient>, email: string) {
  const { error } = await serviceClient
    .from("app_user_invites")
    .update({ status: "accepted", accepted_at: new Date().toISOString() })
    .eq("email", email)
    .neq("status", "accepted");
  if (error) throw error;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return respond({ ok: true });
  if (req.method !== "POST") return respond({ ok: false, error: "Método no permitido." });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return respond({ ok: false, error: "Configuración de Supabase incompleta." });
    }

    const authorization = req.headers.get("Authorization") || "";
    if (!authorization.startsWith("Bearer ")) {
      return respond({ ok: false, error: "Sesión requerida." });
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false }
    });
    const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    const { data: authData, error: authError } = await userClient.auth.getUser();
    if (authError || !authData.user) {
      return respond({ ok: false, error: "Sesión inválida." });
    }

    const { data: callerProfile, error: callerError } = await serviceClient
      .from("profiles")
      .select("access_level,is_active")
      .eq("id", authData.user.id)
      .maybeSingle();
    if (callerError) throw callerError;
    if (!callerProfile || callerProfile.access_level !== "admin" || callerProfile.is_active === false) {
      return respond({ ok: false, error: "Solo un administrador activo puede gestionar credenciales." });
    }

    const payload = await req.json() as AdminUserPayload;
    if ((payload.action || "saveUser") !== "saveUser") {
      return respond({ ok: false, error: "Acción administrativa no reconocida." });
    }

    const email = cleanEmail(payload.email);
    const name = cleanText(payload.name);
    const accessLevel = cleanText(payload.accessLevel || "viewer");
    const password = String(payload.password || "");

    if (!email || !email.includes("@")) return respond({ ok: false, error: "Correo inválido." });
    if (!name) return respond({ ok: false, error: "Nombre requerido." });
    if (!allowedAccessLevels.has(accessLevel)) return respond({ ok: false, error: "Nivel de acceso inválido." });
    if (password && password.length < 8) return respond({ ok: false, error: "La contraseña debe tener al menos 8 caracteres." });

    const normalizedPayload = {
      ...payload,
      email,
      name,
      accessLevel,
      isActive: payload.isActive !== false
    } as Required<Pick<AdminUserPayload, "email" | "name" | "accessLevel">> & AdminUserPayload;

    const targetById = await findProfileById(serviceClient, cleanText(payload.profileId));
    if (payload.profileId && !targetById) {
      return respond({ ok: false, error: "No se encontró el perfil original del usuario." });
    }

    const targetByEmail = await findProfileByEmail(serviceClient, email);
    if (targetByEmail && targetById && targetByEmail.id !== targetById.id) {
      return respond({ ok: false, error: "Ya existe otro usuario con ese correo." });
    }
    const targetProfile = targetById || targetByEmail;

    if (
      targetProfile &&
      targetProfile.id === authData.user.id &&
      (accessLevel !== "admin" || normalizedPayload.isActive === false)
    ) {
      return respond({ ok: false, error: "No puedes quitar tu propio acceso administrador." });
    }

    if (
      targetProfile &&
      targetProfile.access_level === "admin" &&
      (accessLevel !== "admin" || normalizedPayload.isActive === false) &&
      (await activeAdminCount(serviceClient)) <= 1
    ) {
      return respond({ ok: false, error: "Debe existir al menos un administrador activo." });
    }

    if (!targetProfile && !password) {
      const { data: invite, error: inviteError } = await serviceClient
        .from("app_user_invites")
        .upsert(inviteRow(normalizedPayload, authData.user.id), { onConflict: "email" })
        .select("id")
        .single();
      if (inviteError) throw inviteError;

      if (payload.inviteId && invite.id !== payload.inviteId) {
        await serviceClient.from("app_user_invites").delete().eq("id", payload.inviteId);
      }

      const { data: invited, error: inviteAuthError } = await serviceClient.auth.admin.inviteUserByEmail(email, {
        data: { name, created_by_labcontrol_admin: true },
        redirectTo: cleanText(payload.redirectTo) || undefined
      });
      if (inviteAuthError) {
        const existingAuthUser = await findAuthUserByEmail(serviceClient, email);
        if (!existingAuthUser) throw inviteAuthError;
        await upsertProfile(serviceClient, existingAuthUser.id, normalizedPayload);
        await markInvitesAccepted(serviceClient, email);
        return respond({ ok: true, mode: "profile_updated", userId: existingAuthUser.id });
      }

      if (invited.user?.id) {
        await upsertProfile(serviceClient, invited.user.id, normalizedPayload);
        await markInvitesAccepted(serviceClient, email);
      }
      return respond({ ok: true, mode: "invite_sent", userId: invited.user?.id || null });
    }

    const existingAuthUser = targetProfile
      ? { id: targetProfile.id }
      : await findAuthUserByEmail(serviceClient, email);

    if (existingAuthUser?.id) {
      const updates: Record<string, unknown> = {
        email,
        email_confirm: true,
        user_metadata: { name, created_by_labcontrol_admin: true }
      };
      if (password) updates.password = password;
      const { data, error } = await serviceClient.auth.admin.updateUserById(existingAuthUser.id, updates);
      if (error) throw error;
      await upsertProfile(serviceClient, data.user.id, normalizedPayload);
      await markInvitesAccepted(serviceClient, email);
      return respond({ ok: true, mode: targetProfile ? "profile_updated" : "user_created", userId: data.user.id });
    }

    const { data: created, error: createError } = await serviceClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name, created_by_labcontrol_admin: true }
    });
    if (createError) throw createError;
    await upsertProfile(serviceClient, created.user.id, normalizedPayload);
    await markInvitesAccepted(serviceClient, email);

    return respond({ ok: true, mode: "user_created", userId: created.user.id });
  } catch (error) {
    console.error(error);
    return respond({ ok: false, error: error instanceof Error ? error.message : "No se pudo guardar el usuario." });
  }
});
