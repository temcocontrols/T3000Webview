/**
 * file-input-web.tsx — Browser-native replacement for properties-electron.tsx
 *
 * Uses an <input type="file"> element instead of Electron's
 * dialog.showOpenDialog() for file selection in property panels.
 */

import React from "react";
import { observer } from "mobx-react";
import { PropertyEnclosure } from "eez-studio-ui/properties";
import { guid } from "eez-studio-shared/guid";

////////////////////////////////////////////////////////////////////////////////

export const FileInputProperty = observer(
    class FileInputProperty extends React.Component<
        {
            id?: string;
            name?: string;
            value: string;
            onChange: (value: string) => void;
            advanced?: boolean;
            errors?: string[];
        },
        {}
    > {
        fileInputRef = React.createRef<HTMLInputElement>();

        onSelectFile = () => {
            this.fileInputRef.current?.click();
        };

        onFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
            const file = event.target.files?.[0];
            if (file) {
                this.props.onChange(file.name);
            }
            // Reset so the same file can be selected again
            if (this.fileInputRef.current) {
                this.fileInputRef.current.value = "";
            }
        };

        render() {
            const id = this.props.id || guid();

            const input = (
                <div className="input-group">
                    <input
                        id={id}
                        className="form-control"
                        type="text"
                        value={this.props.value}
                        onChange={event =>
                            this.props.onChange(event.target.value)
                        }
                    />
                    <input
                        ref={this.fileInputRef}
                        type="file"
                        style={{ display: "none" }}
                        onChange={this.onFileChange}
                    />
                    <button
                        className="btn btn-secondary"
                        title="Select file"
                        type="button"
                        onClick={this.onSelectFile}
                    >
                        &hellip;
                    </button>
                </div>
            );

            let content;
            if (this.props.name) {
                content = [
                    <td key="name">
                        <label
                            className="PropertyName col-form-label"
                            htmlFor={id}
                        >
                            {this.props.name}
                        </label>
                    </td>,
                    <td key="value">{input}</td>
                ];
            } else {
                content = <td colSpan={2}>{input}</td>;
            }

            return (
                <PropertyEnclosure errors={this.props.errors}>
                    {content}
                </PropertyEnclosure>
            );
        }
    }
);
