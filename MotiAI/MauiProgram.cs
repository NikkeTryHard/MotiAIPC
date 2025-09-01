using Microsoft.Extensions.Logging;
using Microsoft.AspNetCore.Components.WebView.Maui;

namespace MotiAI;

public static class MauiProgram
{
	public static MauiApp CreateMauiApp()
	{
		var builder = MauiApp.CreateBuilder();
		builder
			.UseMauiApp<App>()
			.ConfigureFonts(fonts =>
			{
				fonts.AddFont("Inter_28pt-Regular.ttf", "InterRegular");
				fonts.AddFont("Inter_28pt-Bold.ttf", "InterBold");
			});

		builder.Services.AddMauiBlazorWebView();

#if DEBUG
		builder.Logging.AddDebug();
		builder.Services.AddBlazorWebViewDeveloperTools();
#endif

		return builder.Build();
	}
}
