# Guia de Configuração: FotoSeleção 📸

Este projeto foi construído utilizando **Next.js (App Router)**, **Tailwind CSS**, **Supabase** (Banco de Dados), **Google Drive API** (Armazenamento de Fotos) e **Resend** (Envio de E-mails).

Siga os passos abaixo para configurar suas chaves e rodar a aplicação localmente ou fazer deploy.

---

## 1. Configuração do Google Cloud Console (OAuth & Drive API)
Para permitir o login com Google e salvar as imagens no Drive do fotógrafo:

1. Acesse o [Google Cloud Console](https://console.cloud.google.com/).
2. Crie um novo projeto chamado **FotoSelecao**.
3. No menu lateral, acesse **APIs e Serviços > Biblioteca** e ative a **Google Drive API**.
4. Acesse **APIs e Serviços > Tela de permissão OAuth**:
   - Escolha o tipo de usuário **Externo** (External).
   - Preencha os dados do aplicativo (Nome, E-mail de suporte).
   - Na etapa de **Escopos (Scopes)**, clique em **Adicionar ou remover escopos** e adicione manualmente o seguinte escopo:
     `https://www.googleapis.com/auth/drive.file` (Permite ver e gerenciar apenas os arquivos criados por este app).
   - Na etapa **Usuários de teste (Test users)**, adicione o seu próprio e-mail do Google (para testar em modo de desenvolvimento).
5. Acesse **APIs e Serviços > Credenciais**:
   - Clique em **Criar credenciais > ID do cliente OAuth**.
   - Tipo de aplicativo: **Aplicativo da Web**.
   - Nome: **FotoSelecao Web**.
   - Em **Origens JavaScript autorizadas**, adicione:
     - `http://localhost:3000` (desenvolvimento)
     - `https://seu-app.vercel.app` (sua URL de produção no Vercel)
   - Em **URIs de redirecionamento autorizados**, adicione exatamente:
     - `http://localhost:3000/api/auth/callback/google`
     - `https://seu-app.vercel.app/api/auth/callback/google`
   - Clique em Salvar e copie o **ID do cliente** e a **Chave secreta do cliente** (Client Secret).

---

## 2. Configuração do Supabase (Banco de Dados)
Para armazenar as sessões, seleções e os links públicos das fotos:

1. Acesse o [Supabase](https://supabase.com/) e crie um projeto gratuito.
2. No painel do projeto, abra o **SQL Editor** no menu esquerdo.
3. Clique em **New Query** (Nova Consulta).
4. Copie o conteúdo completo do arquivo localizado em `supabase/schema.sql` deste projeto, cole no editor e clique em **Run** (Executar).
   - *Isso criará as tabelas `sessions` e `photos`, os índices necessários, ativará o RLS (Row Level Security) e criará as políticas de leitura pública.*
5. Vá em **Project Settings > API** (Configurações do Projeto > API) e copie:
   - **Project URL**
   - **API Key (anon public)**
   - **service_role key (secret)** (Clique em revelar para copiar - *esta chave é secreta e só deve ser usada no backend*).

---

## 3. Configuração do Resend (E-mails)
Para disparar e-mails de notificação automática ao fotógrafo quando a seleção for concluída:

1. Acesse o [Resend](https://resend.com/) e crie uma conta gratuita.
2. Vá em **API Keys** no menu lateral e crie uma nova chave.
3. Copie a chave (ela começa com `re_`).
4. *Opcional:* Se quiser enviar de um domínio próprio, configure-o em *Domains*. Caso contrário, o aplicativo usará o remetente de teste padrão `onboarding@resend.dev` que envia diretamente para o e-mail cadastrado na sua conta Resend.

---

## 4. Configuração das Variáveis de Ambiente
Crie um arquivo chamado `.env` na raiz do projeto e preencha as variáveis com as credenciais obtidas nos passos anteriores. Você pode usar o modelo do `.env.example`:

```bash
# Configurações do NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=um_hash_aleatorio_de_32_caracteres_gerado_por_voce

# Credenciais Google OAuth
GOOGLE_CLIENT_ID=seu_client_id_do_google
GOOGLE_CLIENT_SECRET=seu_client_secret_do_google

# Chave Resend
RESEND_API_KEY=sua_chave_do_resend

# Supabase
NEXT_PUBLIC_SUPABASE_URL=sua_url_do_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_anon_key_do_supabase
SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key_do_supabase

# URL Pública do seu app
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

*Dica para gerar a `NEXTAUTH_SECRET`: você pode rodar o comando `openssl rand -base64 32` no seu terminal ou usar uma string longa e aleatória.*

---

## 5. Rodando o Projeto Localmente
Com as credenciais no `.env` e as dependências instaladas, basta executar:

```bash
# Executa o servidor de desenvolvimento
bun run dev
```

Acesse `http://localhost:3000` no seu navegador.

---

## 6. Deploy no Vercel (Produção)
1. Conecte seu repositório Git no Vercel.
2. Adicione todas as variáveis de ambiente descritas acima nas configurações de variáveis do projeto Vercel.
3. Lembre-se de alterar `NEXTAUTH_URL` e `NEXT_PUBLIC_APP_URL` no Vercel para a URL real fornecida pelo Vercel (ex: `https://fotoselecao.vercel.app`).
4. Adicione a URL do Vercel nas credenciais autorizadas no Google Cloud Console (Passo 1.5).
