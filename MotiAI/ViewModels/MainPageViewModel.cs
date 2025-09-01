using MotiAI.Services;
using Newtonsoft.Json.Linq;
using System.Windows.Input;

namespace MotiAI.ViewModels
{
    public class MainPageViewModel : BaseViewModel
    {
        private readonly ApiService _apiService;
        private string _username = "";
        private string _email = "";
        private string _password = "";
        private string _statusMessage = "";

        public MainPageViewModel(ApiService apiService)
        {
            _apiService = apiService;
            LoginCommand = new Command(async () => await OnLogin());
            RegisterCommand = new Command(async () => await OnRegister());
        }

        public string Username
        {
            get => _username;
            set
            {
                if (_username != value)
                {
                    _username = value;
                    OnPropertyChanged();
                }
            }
        }

        public string Email
        {
            get => _email;
            set
            {
                if (_email != value)
                {
                    _email = value;
                    OnPropertyChanged();
                }
            }
        }

        public string Password
        {
            get => _password;
            set
            {
                if (_password != value)
                {
                    _password = value;
                    OnPropertyChanged();
                }
            }
        }

        public string StatusMessage
        {
            get => _statusMessage;
            set
            {
                if (_statusMessage != value)
                {
                    _statusMessage = value;
                    OnPropertyChanged();
                }
            }
        }

        public ICommand LoginCommand { get; }
        public ICommand RegisterCommand { get; }

        private async Task OnLogin()
        {
            if (string.IsNullOrWhiteSpace(Username) || string.IsNullOrWhiteSpace(Password))
            {
                StatusMessage = "Username and password are required.";
                return;
            }

            var result = await _apiService.LoginUserAsync(Username, Password);
            try
            {
                var json = JObject.Parse(result);
                if (json["token"] != null)
                {
                    StatusMessage = "Login successful!";
                }
                else
                {
                    StatusMessage = "Login failed. Please check your credentials.";
                }
            }
            catch
            {
                StatusMessage = "Login failed. An error occurred.";
            }
        }

        private async Task OnRegister()
        {
            if (string.IsNullOrWhiteSpace(Username) || string.IsNullOrWhiteSpace(Email) || string.IsNullOrWhiteSpace(Password))
            {
                StatusMessage = "Username, email, and password are required.";
                return;
            }

            var result = await _apiService.RegisterUserAsync(Username, Email, Password);
            try
            {
                var json = JObject.Parse(result);
                StatusMessage = json["message"]?.ToString() ?? "Registration completed.";
            }
            catch
            {
                StatusMessage = "Registration failed. An error occurred.";
            }
        }
    }
}