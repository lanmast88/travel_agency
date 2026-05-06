import { Dialog, DialogContent } from "@mui/material";
import { useDispatch, useSelector } from "react-redux";
import { AuthPanel } from "./AuthPanel";
import { closeAuthDialog } from "./authSlice";

export function AuthDialog() {
  const dispatch = useDispatch();
  const { authDialogMessage, authDialogMode, authDialogOpen } = useSelector(
    (state) => state.auth,
  );

  const isSessionExpired = Boolean(authDialogMessage);

  return (
    <Dialog
      open={authDialogOpen}
      fullWidth
      maxWidth="xs"
      onClose={(_, reason) => {
        if (reason === "backdropClick") {
          return;
        }

        dispatch(closeAuthDialog());
      }}
      PaperProps={{
        className:
          "!rounded-[32px] !bg-white/95 !shadow-2xl backdrop-blur supports-[backdrop-filter]:!bg-white/90",
      }}
    >
      <DialogContent className="!px-6 !py-7 sm:!px-8 sm:!py-8">
        {isSessionExpired && (
          <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3.5">
            <div className="text-xs font-bold uppercase tracking-[0.16em] text-amber-600">
              Сессия завершена
            </div>
            <div className="mt-1 text-sm font-medium text-amber-800">
              {authDialogMessage}
            </div>
          </div>
        )}
        <AuthPanel
          initialMode={authDialogMode}
          hideTabs={isSessionExpired}
          compact
          onSuccess={() => {
            dispatch(closeAuthDialog());
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
