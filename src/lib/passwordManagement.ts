import { supabase } from './supabase';
import { getSecurityContext } from './security';

export interface PasswordChangeResult {
  success: boolean;
  message: string;
  error?: string;
}

export async function changePassword(
  _currentPassword: string,
  newPassword: string
): Promise<PasswordChangeResult> {
  try {
    if (newPassword.length < 8) {
      return {
        success: false,
        message: 'La contraseña debe tener al menos 8 caracteres',
      };
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, message: 'Usuario no autenticado' };
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (updateError) {
      return {
        success: false,
        message: 'Error al cambiar contraseña',
        error: updateError.message,
      };
    }

    const { data: businessUserData } = await supabase
      .from('business_users')
      .select('business_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (businessUserData) {
      await supabase
        .from('business_users')
        .update({
          must_change_password: false,
          password_changed_at: new Date().toISOString(),
          password_set_by_admin: false,
        })
        .eq('user_id', user.id);

      const context = getSecurityContext();
      await supabase.from('credential_change_log').insert({
        user_id: user.id,
        business_id: businessUserData.business_id,
        change_type: 'password',
        changed_by: user.id,
        changed_by_role: 'user',
        ip_address: context.ipAddress,
        user_agent: context.userAgent,
        notification_sent: true,
        metadata: { method: 'self_service' },
      });

      await createPasswordChangeNotification(
        user.id,
        businessUserData.business_id,
        'user'
      );
    }

    return {
      success: true,
      message: 'Contraseña actualizada exitosamente',
    };
  } catch (error: unknown) {
    console.error('Error changing password:', error);
    return {
      success: false,
      message: 'Error al procesar solicitud',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function mustChangePassword(userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('business_users')
    .select('must_change_password')
    .eq('user_id', userId)
    .maybeSingle();

  return data?.must_change_password === true;
}

export async function requestPasswordRecovery(email: string): Promise<{
  success: boolean;
  message: string;
  requestId?: string;
}> {
  try {
    const { data: businessUserData } = await supabase
      .from('business_users')
      .select('user_id, business_id, full_name')
      .eq('email', email)
      .eq('is_active', true)
      .maybeSingle();

    if (!businessUserData) {
      return {
        success: false,
        message: 'Usuario no está asociado a un negocio activo',
      };
    }

    const requestToken = crypto.randomUUID();
    const context = getSecurityContext();

    const { data: requestData, error: requestError } = await supabase
      .from('password_change_requests')
      .insert({
        user_id: businessUserData.user_id,
        business_id: businessUserData.business_id,
        email: email,
        status: 'pending',
        request_token: requestToken,
        ip_address: context.ipAddress,
        user_agent: context.userAgent,
      })
      .select()
      .single();

    if (requestError) {
      console.error('Error creating request:', requestError);
      return {
        success: false,
        message: 'Error al crear solicitud',
      };
    }

    await supabase.from('superadmin_requests').insert({
      request_type: 'password_recovery',
      status: 'pending' as const,
      priority: 'high' as const,
      business_id: businessUserData.business_id,
      user_id: businessUserData.user_id,
      title: `Solicitud de recuperación de contraseña - ${businessUserData.full_name}`,
      description: `El usuario ${email} ha solicitado recuperación de contraseña desde IP ${context.ipAddress}`,
      metadata: {
        email: email,
        request_token: requestToken,
        ip_address: context.ipAddress ?? null,
      },
    });

    await supabase.rpc('create_notification', {
      p_notification_type: 'password_recovery_request',
      p_priority: 'high',
      p_recipient_type: 'both',
      p_business_id: businessUserData.business_id,
      p_user_id: businessUserData.user_id,
      p_title: 'Solicitud de Recuperación de Contraseña',
      p_message: `Tu solicitud de recuperación de contraseña ha sido enviada. El SuperAdmin la revisará pronto y recibirás un correo de confirmación.`,
      p_metadata: { request_id: requestData.id },
    });

    await supabase.rpc('create_notification', {
      p_notification_type: 'password_recovery_request',
      p_priority: 'high',
      p_recipient_type: 'superadmin',
      p_business_id: businessUserData.business_id,
      p_user_id: businessUserData.user_id,
      p_title: 'Nueva Solicitud de Recuperación de Contraseña',
      p_message: `${businessUserData.full_name} (${email}) ha solicitado recuperación de contraseña.`,
      p_metadata: { request_id: requestData.id },
    });

    return {
      success: true,
      message: 'Solicitud enviada. Recibirás un correo cuando sea procesada.',
      requestId: requestData.id,
    };
  } catch (error: unknown) {
    console.error('Error requesting password recovery:', error);
    return {
      success: false,
      message: 'Error al procesar solicitud',
    };
  }
}

async function createPasswordChangeNotification(
  userId: string,
  businessId: string,
  changedBy: 'user' | 'superadmin'
): Promise<void> {
  const title =
    changedBy === 'user'
      ? 'Contraseña Cambiada'
      : 'Contraseña Restablecida por SuperAdmin';

  const message =
    changedBy === 'user'
      ? 'Tu contraseña ha sido cambiada exitosamente. Si no fuiste tú, contacta inmediatamente al soporte.'
      : 'Tu contraseña ha sido restablecida por el SuperAdmin. Usa la nueva contraseña para iniciar sesión.';

  await supabase.rpc('create_notification', {
    p_notification_type: changedBy === 'user' ? 'password_change' : 'password_set_by_admin',
    p_priority: 'high',
    p_recipient_type: 'both',
    p_business_id: businessId,
    p_user_id: userId,
    p_title: title,
    p_message: message,
    p_metadata: { changed_by: changedBy, timestamp: new Date().toISOString() },
  });
}

export function checkPasswordStrength(password: string): {
  isStrong: boolean;
  score: number;
  feedback: string[];
} {
  const feedback: string[] = [];
  let score = 0;

  if (password.length >= 8) score++;
  else feedback.push('Debe tener al menos 8 caracteres');

  if (password.length >= 12) score++;

  if (/[a-z]/.test(password)) score++;
  else feedback.push('Incluye al menos una letra minúscula');

  if (/[A-Z]/.test(password)) score++;
  else feedback.push('Incluye al menos una letra mayúscula');

  if (/[0-9]/.test(password)) score++;
  else feedback.push('Incluye al menos un número');

  if (/[^a-zA-Z0-9]/.test(password)) score++;
  else feedback.push('Incluye al menos un carácter especial (!@#$%^&*)');

  return {
    isStrong: score >= 4,
    score,
    feedback,
  };
}

export async function validateCurrentPassword(
  email: string,
  password: string
): Promise<boolean> {
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  return !error;
}
