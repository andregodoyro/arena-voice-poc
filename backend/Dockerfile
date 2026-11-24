# ==============================================================================
# ARENA VOICE — OFICIAL BACKEND DOCKERFILE (.NET 10)
# Multi-stage build otimizado para Render Web Service
# ==============================================================================

# ------------------------------------------------------------------------------
# Estágio 1: Build
# ------------------------------------------------------------------------------
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Restauração isolada de dependências para melhor aproveitamento de cache de camadas
COPY ["ArenaVoicePocBackend.csproj", "./"]
RUN dotnet restore "ArenaVoicePocBackend.csproj"

# Cópia do código-fonte e compilação em modo Release
COPY . .
RUN dotnet publish "ArenaVoicePocBackend.csproj" -c Release -o /app/publish /p:UseAppHost=false

# ------------------------------------------------------------------------------
# Estágio 2: Runtime
# ------------------------------------------------------------------------------
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app

# Criação do diretório de uploads persistentes
RUN mkdir -p /app/uploads

# Cópia dos binários compilados
COPY --from=build /app/publish .

# Exposição de porta padrão (sobrescrita em runtime via $PORT pelo Render)
EXPOSE 8080

# Variáveis padrão de ambiente
ENV ASPNETCORE_ENVIRONMENT=Production \
    UPLOADS_DIR=/app/uploads

ENTRYPOINT ["dotnet", "ArenaVoicePocBackend.dll"]
