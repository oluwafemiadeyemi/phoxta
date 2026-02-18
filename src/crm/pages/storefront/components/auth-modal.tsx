import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@crm/components/ui/dialog";
import { Button } from "@crm/components/ui/button";
import { Input } from "@crm/components/ui/input";
import { Label } from "@crm/components/ui/label";
import { Separator } from "@crm/components/ui/separator";
import { cn } from "@crm/lib/utils";
import {
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Phone,
  MapPin,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";

export interface StoreCustomer {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  gsm: string;
  address: string;
  avatar_url: string | null;
  store_id?: string;
  created_at: string;
}

interface StorefrontAuthModalProps {
  open: boolean;
  onClose: () => void;
  storeId: string;
  storeName: string;
  onAuthSuccess: (customer: StoreCustomer) => void;
}

type AuthTab = "signin" | "signup";

export function StorefrontAuthModal({
  open,
  onClose,
  storeId,
  storeName,
  onAuthSuccess,
}: StorefrontAuthModalProps) {
  const [tab, setTab] = useState<AuthTab>("signin");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Sign in fields
  const [signInEmail, setSignInEmail] = useState("");
  const [signInPassword, setSignInPassword] = useState("");
  const [showSignInPw, setShowSignInPw] = useState(false);

  // Sign up fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [signUpEmail, setSignUpEmail] = useState("");
  const [signUpPassword, setSignUpPassword] = useState("");
  const [signUpConfirm, setSignUpConfirm] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [showSignUpPw, setShowSignUpPw] = useState(false);

  const resetForm = () => {
    setError(null);
    setSuccess(null);
    setSignInEmail("");
    setSignInPassword("");
    setFirstName("");
    setLastName("");
    setSignUpEmail("");
    setSignUpPassword("");
    setSignUpConfirm("");
    setPhone("");
    setAddress("");
  };

  const handleTabSwitch = (newTab: AuthTab) => {
    setTab(newTab);
    setError(null);
    setSuccess(null);
  };

  const handleSignIn = async () => {
    if (!signInEmail.trim() || !signInPassword) {
      setError("Please enter your email and password.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/store/auth/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: signInEmail.trim(),
          password: signInPassword,
          storeId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Sign in failed.");
        return;
      }

      setSuccess("Welcome back!");
      setTimeout(() => {
        onAuthSuccess(data.customer);
        onClose();
        resetForm();
      }, 600);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      setError("Please enter your full name.");
      return;
    }
    if (!signUpEmail.trim()) {
      setError("Please enter your email address.");
      return;
    }
    if (signUpPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (signUpPassword !== signUpConfirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/store/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: signUpEmail.trim(),
          password: signUpPassword,
          phone: phone.trim(),
          address: address.trim(),
          storeId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Registration failed.");
        return;
      }

      setSuccess("Account created! Welcome aboard.");
      setTimeout(() => {
        onAuthSuccess(data.customer);
        onClose();
        resetForm();
      }, 600);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) {
          onClose();
          resetForm();
        }
      }}
    >
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto p-0">
        {/* Header with gradient */}
        <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent px-6 pt-6 pb-4">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              {tab === "signin" ? "Welcome Back" : "Create Account"}
            </DialogTitle>
            <DialogDescription>
              {tab === "signin"
                ? `Sign in to your ${storeName} account`
                : `Join ${storeName} for a personalized shopping experience`}
            </DialogDescription>
          </DialogHeader>

          {/* Tab switcher */}
          <div className="flex mt-4 bg-muted rounded-lg p-1">
            <button
              onClick={() => handleTabSwitch("signin")}
              className={cn(
                "flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all",
                tab === "signin"
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Sign In
            </button>
            <button
              onClick={() => handleTabSwitch("signup")}
              className={cn(
                "flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all",
                tab === "signup"
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Create Account
            </button>
          </div>
        </div>

        <div className="px-6 pb-6">
          {/* Error/Success messages */}
          {error && (
            <div className="flex items-center gap-2 p-3 mb-4 rounded-lg bg-destructive/10 text-destructive text-sm">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}
          {success && (
            <div className="flex items-center gap-2 p-3 mb-4 rounded-lg bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400 text-sm">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              {success}
            </div>
          )}

          {/* SIGN IN FORM */}
          {tab === "signin" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signin-email" className="text-sm font-medium">
                  Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="signin-email"
                    type="email"
                    placeholder="you@example.com"
                    value={signInEmail}
                    onChange={(e) => setSignInEmail(e.target.value)}
                    className="pl-10"
                    onKeyDown={(e) => e.key === "Enter" && handleSignIn()}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="signin-pw" className="text-sm font-medium">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="signin-pw"
                    type={showSignInPw ? "text" : "password"}
                    placeholder="••••••••"
                    value={signInPassword}
                    onChange={(e) => setSignInPassword(e.target.value)}
                    className="pl-10 pr-10"
                    onKeyDown={(e) => e.key === "Enter" && handleSignIn()}
                  />
                  <button
                    type="button"
                    onClick={() => setShowSignInPw(!showSignInPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showSignInPw ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <Button
                onClick={handleSignIn}
                disabled={loading}
                className="w-full h-11"
                size="lg"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <ArrowRight className="h-4 w-4 mr-2" />
                )}
                {loading ? "Signing in..." : "Sign In"}
              </Button>

              <div className="text-center">
                <button
                  onClick={() => handleTabSwitch("signup")}
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  Don&apos;t have an account?{" "}
                  <span className="font-semibold text-primary">Sign up</span>
                </button>
              </div>
            </div>
          )}

          {/* SIGN UP FORM */}
          {tab === "signup" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="signup-first" className="text-sm font-medium">
                    First Name *
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signup-first"
                      placeholder="John"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-last" className="text-sm font-medium">
                    Last Name *
                  </Label>
                  <Input
                    id="signup-last"
                    placeholder="Doe"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="signup-email" className="text-sm font-medium">
                  Email *
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="you@example.com"
                    value={signUpEmail}
                    onChange={(e) => setSignUpEmail(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="signup-pw" className="text-sm font-medium">
                  Password *
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="signup-pw"
                    type={showSignUpPw ? "text" : "password"}
                    placeholder="Min. 8 characters"
                    value={signUpPassword}
                    onChange={(e) => setSignUpPassword(e.target.value)}
                    className="pl-10 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSignUpPw(!showSignUpPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showSignUpPw ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {signUpPassword.length > 0 && signUpPassword.length < 8 && (
                  <p className="text-xs text-destructive">
                    Must be at least 8 characters
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="signup-confirm" className="text-sm font-medium">
                  Confirm Password *
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="signup-confirm"
                    type="password"
                    placeholder="Confirm password"
                    value={signUpConfirm}
                    onChange={(e) => setSignUpConfirm(e.target.value)}
                    className="pl-10"
                    onKeyDown={(e) => e.key === "Enter" && handleSignUp()}
                  />
                </div>
                {signUpConfirm.length > 0 &&
                  signUpPassword !== signUpConfirm && (
                    <p className="text-xs text-destructive">
                      Passwords do not match
                    </p>
                  )}
              </div>

              <Separator />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="signup-phone" className="text-sm font-medium">
                    Phone
                  </Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signup-phone"
                      placeholder="+44 7700 000000"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="signup-address"
                    className="text-sm font-medium"
                  >
                    Address
                  </Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signup-address"
                      placeholder="Your delivery address"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>

              <Button
                onClick={handleSignUp}
                disabled={loading}
                className="w-full h-11"
                size="lg"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <User className="h-4 w-4 mr-2" />
                )}
                {loading ? "Creating account..." : "Create Account"}
              </Button>

              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5" />
                Your data is encrypted and secure
              </div>

              <div className="text-center">
                <button
                  onClick={() => handleTabSwitch("signin")}
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  Already have an account?{" "}
                  <span className="font-semibold text-primary">Sign in</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
