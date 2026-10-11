package ee.forgr.jevit;

import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.net.Uri;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Opens a URL in the user's default browser, even when another app claims the link as an
 * Android App Link (capgo.app opens the Capgo app otherwise).
 */
@CapacitorPlugin(name = "ExternalBrowser")
public class ExternalBrowserPlugin extends Plugin {

    @PluginMethod
    public void open(PluginCall call) {
        String url = call.getString("url");
        if (url == null || !(url.startsWith("https://") || url.startsWith("http://"))) {
            call.reject("An http(s) url is required");
            return;
        }
        Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
        intent.addCategory(Intent.CATEGORY_BROWSABLE);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);

        // The default browser is whatever handles a plain web link no app has claimed.
        PackageManager pm = getContext().getPackageManager();
        ResolveInfo browser = pm.resolveActivity(new Intent(Intent.ACTION_VIEW, Uri.parse("https://example.com")), PackageManager.MATCH_DEFAULT_ONLY);
        if (browser != null && browser.activityInfo != null && !"android".equals(browser.activityInfo.packageName)) {
            intent.setPackage(browser.activityInfo.packageName);
        }
        try {
            getActivity().startActivity(intent);
            call.resolve();
        } catch (ActivityNotFoundException e) {
            intent.setPackage(null);
            try {
                getActivity().startActivity(intent);
                call.resolve();
            } catch (ActivityNotFoundException e2) {
                call.reject("No browser installed");
            }
        }
    }
}
