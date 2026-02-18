import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Database, Loader2, Sparkles, X } from "lucide-react";
import { checkNeedsSeed, seedDatabase } from "../lib/seed-database";
import { useNotification } from "@refinedev/core";

export function FirstTimeSetup() {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const { open: notify } = useNotification();

  useEffect(() => {
    const checkFirstTime = async () => {
      // Check if user has dismissed this dialog before
      const dismissed = localStorage.getItem("first_time_setup_dismissed");
      if (dismissed) {
        setIsChecking(false);
        return;
      }

      // Check if database needs seeding
      const needsSeed = await checkNeedsSeed();
      setOpen(needsSeed);
      setIsChecking(false);
    };

    // Delay check to allow page to load
    const timer = setTimeout(checkFirstTime, 1000);
    return () => clearTimeout(timer);
  }, []);

  const handleLoadSampleData = async () => {
    setIsLoading(true);
    try {
      const result = await seedDatabase();

      if (result.success) {
        notify?.({
          type: "success",
          message: "Welcome to your CRM!",
          description: result.message,
        });
        setOpen(false);
        localStorage.setItem("first_time_setup_dismissed", "true");

        // Reload page to show new data
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        notify?.({
          type: "error",
          message: "Failed to Load Sample Data",
          description: result.error || result.message,
        });
      }
    } catch (error) {
      notify?.({
        type: "error",
        message: "Error Loading Sample Data",
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = () => {
    setOpen(false);
    localStorage.setItem("first_time_setup_dismissed", "true");
  };

  if (isChecking) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Welcome to Your CRM!
            </DialogTitle>
          </div>
          <DialogDescription className="text-left space-y-3 pt-2">
            <p>Your CRM is ready to use! Would you like to load sample data to explore the features?</p>
            <div className="bg-muted p-3 rounded-md space-y-2">
              <p className="text-sm font-medium text-foreground">Sample data includes:</p>
              <ul className="text-sm space-y-1 ml-4 list-disc">
                <li>Contacts & Companies</li>
                <li>Sales pipeline with deals</li>
                <li>Projects & Tasks</li>
                <li>Quotes</li>
              </ul>
            </div>
            <p className="text-xs text-muted-foreground">
              You can delete or modify this data anytime from Settings → Export.
            </p>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={handleSkip} disabled={isLoading} className="w-full sm:w-auto">
            <X className="mr-2 h-4 w-4" />
            Start Fresh
          </Button>
          <Button onClick={handleLoadSampleData} disabled={isLoading} className="w-full sm:w-auto">
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading Sample Data...
              </>
            ) : (
              <>
                <Database className="mr-2 h-4 w-4" />
                Load Sample Data
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
