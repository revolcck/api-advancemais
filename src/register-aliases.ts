import moduleAlias from "module-alias";
import path from "path";

// Registra o alias @ para apontar para a pasta dist
moduleAlias.addAliases({
  "@": path.join(__dirname),
});
