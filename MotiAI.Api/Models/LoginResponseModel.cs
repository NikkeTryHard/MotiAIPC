namespace MotiAI.Api.Models
{
    public class LoginResponseModel
    {
        public string? Token { get; set; }
        public DateTime Expiration { get; set; }
    }
}