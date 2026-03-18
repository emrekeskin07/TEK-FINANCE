import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { supabase } from '../supabaseClient';

export function useAuthSession() {
  const [authUser, setAuthUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authSubmitting, setAuthSubmitting] = useState(false);

  useEffect(() => {
    if (!supabase) {
      setAuthLoading(false);
      return;
    }

    let isMounted = true;

    const bootstrapSession = async () => {
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        console.error('Supabase auth session hatasi:', error);
      }

      if (isMounted) {
        setAuthUser(data?.session?.user || null);
        setAuthLoading(false);
      }
    };

    bootstrapSession();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthUser(session?.user || null);
    });

    return () => {
      isMounted = false;
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  const handleGoogleSignIn = async () => {
    if (!supabase) {
      toast.error('Supabase baglantisi bulunamadi.');
      return;
    }

    setAuthSubmitting(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });
    setAuthSubmitting(false);

    if (error) {
      console.error('Google auth hatasi:', error);
      const message = String(error?.message || '').toLowerCase();
      if (message.includes('provider is not enabled') || message.includes('unsupported provider')) {
        toast.error('Google provider kapali. Supabase Authentication > Providers > Google alaninda Enable etmelisin.');
      } else {
        toast.error('Google ile giris baslatilamadi.');
      }
    }
  };

  const handleEmailSignUp = async ({ fullName, email, password }) => {
    if (!supabase) {
      toast.error('Supabase baglantisi bulunamadi.');
      return;
    }

    setAuthSubmitting(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName || '',
        },
      },
    });
    setAuthSubmitting(false);

    if (error) {
      console.error('Email kayit hatasi:', error);
      toast.error(error.message || 'Kayit islemi basarisiz.');
      return;
    }

    if (data?.user && !data?.session) {
      toast.success('Kayit olusturuldu. E-posta dogrulama baglantisini kontrol edin.');
      return;
    }

    toast.success('Kayit basariyla tamamlandi.');
  };

  const handleEmailSignIn = async ({ email, password }) => {
    if (!supabase) {
      toast.error('Supabase baglantisi bulunamadi.');
      return;
    }

    setAuthSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setAuthSubmitting(false);

    if (error) {
      console.error('Email giris hatasi:', error);
      toast.error(error.message || 'Giris islemi basarisiz.');
      return;
    }

    toast.success('Hos geldiniz.');
  };

  const handleSignOut = async () => {
    if (!supabase) {
      return;
    }

    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error('Cikis hatasi:', error);
      toast.error('Cikis yapilamadi.');
      return;
    }

    toast.success('Cikis yapildi.');
  };

  return {
    authUser,
    authLoading,
    authSubmitting,
    handleGoogleSignIn,
    handleEmailSignUp,
    handleEmailSignIn,
    handleSignOut,
  };
}
