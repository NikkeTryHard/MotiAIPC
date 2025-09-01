using System.Net.Http;
using System.Text;
using System.Threading.Tasks;
using Newtonsoft.Json;

namespace MotiAI.Services
{
    public class ApiService
    {
        private readonly HttpClient _httpClient = new HttpClient();
        private const string BaseUrl = "http://localhost:5000/api"; // Adjust port if necessary

        public async Task<string> RegisterUserAsync(string username, string email, string password)
        {
            var model = new { username, email, password };
            var json = JsonConvert.SerializeObject(model);
            var content = new StringContent(json, Encoding.UTF8, "application/json");

            var response = await _httpClient.PostAsync($"{BaseUrl}/auth/register", content);

            return await response.Content.ReadAsStringAsync();
        }

        public async Task<string> LoginUserAsync(string username, string password)
        {
            var model = new { username, password };
            var json = JsonConvert.SerializeObject(model);
            var content = new StringContent(json, Encoding.UTF8, "application/json");

            var response = await _httpClient.PostAsync($"{BaseUrl}/auth/login", content);
            
            return await response.Content.ReadAsStringAsync();
        }
    }
}