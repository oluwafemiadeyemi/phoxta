import { useState } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "./ui/alert-dialog";
import { Database, Trash2, Loader2, Download } from "lucide-react";
import { seedDatabase, clearUserData } from "../lib/seed-database";
import { useNotification } from "@refinedev/core";

export function DataSeedingControls() {
  const [isSeeding, setIsSeeding] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const { open } = useNotification();

  const handleSeedDatabase = async () => {
    setIsSeeding(true);
    try {
      const result = await seedDatabase();

      if (result.success) {
        open?.({
          type: "success",
          message: "Sample Data Loaded",
          description: result.message,
        });
        // Reload page to refresh data
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        open?.({
          type: "error",
          message: "Failed to Load Sample Data",
          description: result.error || result.message,
        });
      }
    } catch (error) {
      open?.({
        type: "error",
        message: "Error Loading Sample Data",
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsSeeding(false);
    }
  };

  const handleClearData = async () => {
    setIsClearing(true);
    try {
      const result = await clearUserData();

      if (result.success) {
        open?.({
          type: "success",
          message: "Data Cleared",
          description: result.message,
        });
        // Reload page to refresh data
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        open?.({
          type: "error",
          message: "Failed to Clear Data",
          description: result.error || result.message,
        });
      }
    } catch (error) {
      open?.({
        type: "error",
        message: "Error Clearing Data",
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Sample Data Management
        </CardTitle>
        <CardDescription>
          Load sample data to explore the CRM features or clear all your data to start fresh
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Load Sample Data</h4>
          <p className="text-sm text-muted-foreground">
            Populate your database with sample contacts, companies, deals, tasks, quotes, and more. Perfect for testing
            and exploring features.
          </p>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" disabled={isSeeding}>
                {isSeeding ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading Sample Data...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Load Sample Data
                  </>
                )}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Load Sample Data?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will add sample contacts, companies, deals, projects, tasks, and quotes to your account. This
                  data can be deleted later. Any existing data will be preserved.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleSeedDatabase}>Load Sample Data</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        <div className="border-t pt-4 space-y-2">
          <h4 className="text-sm font-medium text-destructive">Danger Zone</h4>
          <p className="text-sm text-muted-foreground">
            Clear all your CRM data including contacts, companies, deals, tasks, and quotes. This action cannot be
            undone.
          </p>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={isClearing}>
                {isClearing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Clearing Data...
                  </>
                ) : (
                  <>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Clear All Data
                  </>
                )}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete all your CRM data including contacts,
                  companies, deals, projects, tasks, and quotes.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleClearData}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Yes, Clear All Data
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
}
