



function FolderController()
{
// On demande et stocke le nom du client
var userId = prompt('Nom du client :', '');

// On instancie l'objet ActiveX, à faire une fois seulement.
var fso = new ActiveXObject("Scripting.FileSystemObject");

// On verifie si le repertoire de ce client existe deja
repExiste = fso.FolderExists(userId);

// On calcule le "path" du repertoire client et du repertoire upload
var chemin_client = fso.GetAbsolutePathName(userId);
var chemin_upload = fso.GetAbsolutePathName("upload");
var chemin_client_jpg = chemin_client+"\\jpg";
var chemin_client_gif = chemin_client+"\\gif";

// On logge chaque nom de client traité dans le fichier log.txt
var fh
fh = fso.OpenTextFile("log.txt", 8, true)
fh.WriteLine(userId);
fh.Close();

if (repExiste)
{
     alert('Client connu');
     // Appel de la fonction "copydel"
     copydel();
}
else
{
    
     // On cree le repertoire du client ainsi que ses sous-repertoires "jpg" et "gif"
     fso.CreateFolder(userId);
     fso.CreateFolder(chemin_client_jpg);
     fso.CreateFolder(chemin_client_gif);
     // Appel de la fonction "copydel"
     copydel();
}
}
